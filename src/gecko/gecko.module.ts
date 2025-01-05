import { Module } from '@nestjs/common';
import { GeckoService } from './gecko.service';
import { GeckoController } from './gecko.controller';
import { HttpModule } from '@nestjs/axios';
import { DasModule } from 'src/das/das.module';

@Module({
  imports: [HttpModule, DasModule],
  providers: [GeckoService],
  controllers: [GeckoController],
  exports: [GeckoService],
})
export class GeckoModule {}
