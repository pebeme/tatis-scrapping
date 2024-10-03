import { Module } from '@nestjs/common';
import { ActividadesController } from './actividades.controller';

@Module({
    controllers: [ActividadesController],
})
export class ActividadesModule {}
