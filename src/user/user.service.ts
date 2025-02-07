import { forwardRef, HttpException, HttpStatus, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schema/user.schema';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { AuthTokens, CreateUserPayload, userJwtData } from './dto/user.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { REFRESH_TOKEN_ENV } from 'src/auth/costant';
import { RedisService } from 'src/redis/redis.service';
import { VaultService } from 'src/vault/vault.service';

@Injectable()
export class UserService {
    logger = new Logger(UserService.name)
    constructor(
        @InjectConnection() private readonly connection: mongoose.Connection,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private configService: ConfigService,
        private redisService: RedisService,
        @Inject(forwardRef(() => VaultService))
        private vaultService: VaultService,
        // private cloudinaryService: CloudinaryService,
        private jwtService: JwtService
    ) { }

    async getOrCreateNewUser({ address, email }: CreateUserPayload): Promise<User> {

        const foundUser = await this.userModel.findOne({ address }).lean()
        if (!foundUser) {
            return (await this.userModel.create({ address, email })).toObject();
        }

        return foundUser

    }

    async getUserByAddress(address: string): Promise<User> {
        try {
            const user = await this.userModel.findOne({ address }).lean()
            if (!user) {
                throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
            }
            return user
        } catch (error) {
            throw error
        }
    }


    async loginUser({ address, email }: CreateUserPayload): Promise<User> {
        try {
            const foundUser = await this.getOrCreateNewUser({ address, email })
            return foundUser

        } catch (error) {
            throw error
        }
    }

    async signUserdataWithJwt(payload: userJwtData): Promise<AuthTokens> {
        try {
            const accessToken = await this.jwtService.signAsync(payload)

            const refreshToken = await this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>(REFRESH_TOKEN_ENV),
                expiresIn: "3600s" //1hr
            })
            return { accessToken, refreshToken }
        } catch (error) {
            throw error
        }
    }

    async setUserInAppWallet(
        address: string,
        inAppAddress: string
    ): Promise<User> {
        try {
            return this.userModel.findOneAndUpdate(
                { address },
                { inAppAddress },
                { new: true }
            )
        } catch (error) {
            console.log("Failed to update user inApp wallet");
            throw error
        }
    }

    async revokeUserWallet(address: string): Promise<any> {
        // async function deleteFromAllStores(documentId: string): Promise<DeleteResult> {
        // Start MongoDB transaction
        // try {
        //     let temp = await this.userModel.findOne({ address }).lean();
        //     console.log('Query result:', temp);
        //   } catch (error) {
        //     console.error('Error during findOne:', error);
        //   }
        console.log('got here 1');
        try {
            console.log('Mongoose connection ready state:', this.connection.readyState);
            const session = await this.connection.startSession();
            console.log('got here 2');
            try {
                session.startTransaction();
                console.log('got here 3');
                // 1. First mark the document as "pending_deletion" in MongoDB
                //   let temp = await this.userModel.findOne({ address }).lean()
                //   console.log(temp);

                const markResult = await this.userModel.updateOne(
                    { address },
                    {
                        $set: {
                            status: 'pending_deletion',
                            deletionStartedAt: new Date(),
                            mongoDeleted: false,
                            redisDeleted: false,
                            vaultDeleted: false
                        }
                    },
                    { session }
                );
                console.log('got here 4');



                if (!markResult.modifiedCount) {
                    //   if (!markResult.modifiedCount) {
                    // await session.abortTransaction();
                    this.logger.log("No data was modified ")
                    return { success: false, error: new Error('Document not found') };
                }

                console.log('got here 5');
                // 2. Delete from Vault first (since it might contain sensitive data)
                try {
                    await this.vaultService.deleteSecret(address);
                    // await this.vaultService.deleteSecret(`secret/data/${address}`);
                    console.log('got here 3');
                    await this.userModel.updateOne(
                        { address },
                        { $set: { vaultDeleted: true } },
                        { session }
                    );
                    this.logger.log(`Successfully deleted from vault`)

                } catch (vaultError) {
                    this.logger.log(`Failed to delete from vault`, vaultError)
                    // await session.abortTransaction();
                    throw new InternalServerErrorException({
                        success: false,
                        vaultDeleted: false,
                        error: vaultError
                    });
                }

                // 3. Delete from Redis
                try {
                    await this.redisService.deleteKey(address);

                    await this.userModel.updateOne(
                        { address },
                        { $set: { redisDeleted: true } },
                        { session }
                    );

                    this.logger.log(`Successfully deleted from redis`)
                } catch (redisError) {
                    // If Redis deletion fails, we need to restore Vault data
                    try {
                        await this.vaultService.restoreSecret(address);
                        //   await this.vaultService.restoreSecret(`secret/data/${address}`);
                    } catch (restoreError) {
                        // Log that we couldn't restore Vault data
                        this.logger.log('Failed to restore Vault data:', restoreError);
                        throw restoreError
                    }

                    // await session.abortTransaction();
                    return {
                        success: false,
                        vaultDeleted: true,
                        redisDeleted: false,
                        error: redisError
                    };
                }

                // 4. Finally, actually delete/update the MongoDB document
                try {
                    await this.userModel.updateOne(
                        { address },
                        {
                            $set: {
                                inAppAddress: '',
                                status: 'deleted',
                                mongoDeleted: true,
                                deletedAt: new Date()
                            }
                        },
                        { session }
                    );

                    this.logger.log("Successfully Deleted user credentials from Vault, Redis and Mongo")
                } catch (mongoError) {
                    // Need to restore both Vault and Redis
                    try {
                        await Promise.all([
                            this.vaultService.restoreSecret(address),
                            this.redisService.restore(address)
                            // this.redisService.restore(`cache:${documentId}`)
                        ]);
                    } catch (restoreError) {
                        this.logger.log('Failed to restore data:', restoreError);
                        throw restoreError
                    }

                    // await session.abortTransaction();
                    this.logger.log(`Transaction complete`)
                    return {
                        success: false,
                        vaultDeleted: true,
                        redisDeleted: true,
                        mongoDeleted: false,
                        error: mongoError
                    };
                }

                // If we got here, everything succeeded
                await session.commitTransaction();
                return {
                    success: true,
                    vaultDeleted: true,
                    redisDeleted: true,
                    mongoDeleted: true
                };

            } catch (error) {
                await session.abortTransaction();
                return { success: false, error };
            } finally {
                session.endSession();
            }
        } catch (error) {
            console.log('Error', error);
        }


        //   }

        // const session = await mongoose.startSession();

        // try {
        //     session.startTransaction();

        //     const result = await this.userModel.findOneAndUpdate(
        //         { address },
        //         { $set: { inAppAddress: '' } },
        //         { session }
        //     );

        //     if (result.isModified) {
        //         await this.redisService.deleteKey(address);
        //         await session.commitTransaction();
        //         return true;
        //     }

        //     await session.abortTransaction();
        //     return false;

        // } catch (error) {
        //     await session.abortTransaction();
        //     throw error;
        // } finally {
        //     session.endSession();
        // }
    }
}
