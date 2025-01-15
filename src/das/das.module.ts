import { Module } from '@nestjs/common';
import { DasService } from './das.service';
import { DasController } from './das.controller';

@Module({
  providers: [DasService],
  controllers: [DasController],
  exports: [DasService],
})

export class DasModule {}
