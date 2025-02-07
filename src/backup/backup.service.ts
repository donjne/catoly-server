import { Injectable } from '@nestjs/common';
import { BackUp, BackUpDocument } from './backup.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { backUp } from './backup.types';

@Injectable()
export class BackupService {

    constructor(
        @InjectModel(BackUp.name) private backUpModel: Model<BackUpDocument>, 
    ){}


    async create(payload: backUp): Promise<BackUp> {
        try {
            return await this.backUpModel.create(payload)
        } catch (error) {
            throw error
        }
    }

    model() {
        return this.backUpModel
    }
}
