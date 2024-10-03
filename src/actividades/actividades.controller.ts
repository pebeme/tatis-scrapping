import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import * as puppeteer from 'puppeteer-core';
import * as xlsx from 'xlsx';
import * as path from 'path';

@Controller('actividades')
export class ActividadesController {
  @Get('download')
  async download(@Res() res: Response) {
    const cities = [
      'cusco',
      'santiago-de-chile',
      'puerto-natales',
      'san-pedro-de-atacama',
      'punta-arenas',
    ];

    const maxActivities = 3; // Límite de actividades a extraer
    const workbook = xlsx.utils.book_new(); // Crear un nuevo libro de Excel
		console.log('HOLA 1', process.env.NODE_ENV, process.env.PUPPETEER_EXECUTABLE_PATH);
    // Inicializar el navegador con Puppeteer
    const browser = await puppeteer.launch({
      // headless: true,
			timeout: 0,
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--single-process',
        '--no-zygote',
      ],
      //executablePath: `/usr/bin/chromium-browser`,
      executablePath:
        process.env.NODE_ENV === 'production'
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
		console.log('HOLA 2');
    for (const city of cities) {
      const baseUrl = `https://www.civitatis.com/es/${city}/`;
      const allActivityLinks = new Set<string>(); // Usamos un Set para evitar duplicados
      const allActivitiesData: any[] = [];

      // Función para obtener las URLs de las actividades de una página específica
      const getActivityLinksFromPage = async (
        pageUrl: string,
      ): Promise<string[]> => {
        const pageInstance = await browser.newPage();
				console.log('PI => ', pageInstance);
        await pageInstance.goto(pageUrl, { waitUntil: 'networkidle2' });

        const activityLinks = await pageInstance.$$eval(
          'a._activity-link',
          (links) => links.map((link) => link.href), // Obtener el href de cada enlace
        );
				console.log('activityLinks => ', activityLinks);
        await pageInstance.close();
        return activityLinks;
      };

      // Función para extraer el nombre, precio, moneda y rating de una actividad
      const getActivityDetails = async (activityUrl: string) => {
        const pageInstance = await browser.newPage();
        await pageInstance.goto(activityUrl, { waitUntil: 'networkidle2' });

        // Extraer el nombre (h1)
        const name = await pageInstance.$eval('h1', (h1) =>
          h1.textContent.trim(),
        );

        // Extraer el precio (class a-text--price--big)
        let priceValue = 'No disponible';
        let priceCurrency = 'No disponible';
        try {
          const priceText = await pageInstance.$eval(
            '.a-text--price--big',
            (span) => span.textContent.trim(),
          );
          const priceMatch = priceText.match(/^([\d.,]+)\s*([A-Za-z$]+)/);
          if (priceMatch) {
            priceValue = priceMatch[1]; // El valor numérico del precio
            priceCurrency = priceMatch[2]; // La moneda
          }
        } catch (error) {
          // Precio no disponible, se mantiene el valor predeterminado
        }

        // Extraer el rating (class a-text--rating-total)
        let rating = 'No disponible';
        try {
          const ratingText = await pageInstance.$eval(
            '.a-text--rating-total',
            (span) => span.textContent.trim(),
          );
          const ratingMatch = ratingText.match(/([\d.,]+)\s*viajeros/);
          if (ratingMatch) {
            rating = ratingMatch[1]; // El número de viajeros antes de la palabra "viajeros"
          }
        } catch (error) {
          // Rating no disponible, se mantiene el valor predeterminado
        }

        await pageInstance.close();
        return { name, priceValue, priceCurrency, rating, url: activityUrl };
      };

      // Extraer actividades de la primera y segunda página
      console.log(`Extrayendo actividades de ${city}...`);
      for (let page = 1; page <= 2; page++) {
        const pageUrl = page === 1 ? baseUrl : `${baseUrl}${page}/`;
        console.log(`Extrayendo actividades de la página ${page}...`);
        const activityLinks = await getActivityLinksFromPage(pageUrl);
        activityLinks.forEach((link) => allActivityLinks.add(link)); // Agregar enlaces al Set
      }

      // Contador de actividades extraídas
      let activitiesCount = 0;

      // Recorrer cada actividad y extraer los detalles (nombre, precio, rating)
      for (const activityUrl of allActivityLinks) {
        if (activitiesCount >= maxActivities) {
          break; // Salir del bucle si se ha alcanzado el límite
        }
        console.log(`Extrayendo detalles de: ${activityUrl}`);
        const details = await getActivityDetails(activityUrl);
        allActivitiesData.push(details);
        activitiesCount++; // Incrementar el contador
      }

      // Crear una hoja de Excel para la ciudad actual
      const worksheet = xlsx.utils.json_to_sheet(allActivitiesData);
      xlsx.utils.book_append_sheet(
        workbook,
        worksheet,
        city.charAt(0).toUpperCase() + city.slice(1),
      ); // Nombre de la hoja capitalizando la ciudad
    }

    // Guardar el archivo .xls
    const filePath = path.join(__dirname, 'actividades_cidades.xlsx');
    xlsx.writeFile(workbook, filePath);
    console.log(`Archivo Excel generado: ${filePath}`);

    // Enviar el archivo como respuesta
    res.download(filePath, 'actividades_cidades.xlsx', (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error al descargar el archivo.');
      }
    });

    // Cerrar el navegador
    await browser.close();
  }
}
