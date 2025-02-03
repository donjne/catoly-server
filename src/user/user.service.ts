import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schema/user.schema';
import { Model } from 'mongoose';
import { AuthTokens, CreateUserPayload, userJwtData } from './dto/user.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { REFRESH_TOKEN_ENV } from 'src/auth/costant';

@Injectable()
export class UserService {

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private configService: ConfigService,
        // private cloudinaryService: CloudinaryService,
        private jwtService: JwtService
    ){}

    async getOrCreateNewUser({address, email }: CreateUserPayload): Promise<User> {
        
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

            const refreshToken = await this.jwtService.signAsync(payload,{ 
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
    ): Promise<User>{
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
}
