import { Module } from '@nestjs/common';
import { ActividadesModule } from './actividades/actividades.module';

@Module({
    imports: [ActividadesModule],
})
export class AppModule {}
