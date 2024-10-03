import { Module } from '@nestjs/common';
import { ActividadesModule } from './actividades/actividades.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [],
      isGlobal: true,
    }),
    ActividadesModule,
  ],
})
export class AppModule {}
