import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { MongooseModule } from '@nestjs/mongoose';
import { BackUp, BackUpSchema } from './backup.schema';

@Module({
  providers: [BackupService],
  imports: [
    MongooseModule.forFeature([
      {name: BackUp.name, schema: BackUpSchema},
    ]),
  ],
  exports: [
    BackupService
  ]
})
export class BackupModule {}
