import { green, red, yellow } from 'colors';
import * as fs from 'fs';
import { IGenerateModelsConfig } from './models';
import { deliveryModelGenerator } from './generators/delivery/delivery-model.generator';
import { deliveryProjectGenerator } from './generators';
import { createManagementClient } from '@kentico/kontent-management';
import { deliveryTaxonomylGenerator as deliveryTaxonomyGenerator } from './generators/delivery/delivery-taxonomy.generator';
import { commonHelper } from './common-helper';

export async function generateModelsAsync(config: IGenerateModelsConfig): Promise<void> {
    console.log(green(`Model generator started \n`));

    try {
        if (config.sdkType === 'delivery') {
            console.log(`Generating '${yellow('delivery')}' models\n`);

            const deliveryClient = createManagementClient({
                projectId: config.projectId,
                apiKey: config.apiKey
            });

            const types = (await deliveryClient.listContentTypes().toAllPromise()).data.items;
            const languages = (await deliveryClient.listLanguages().toAllPromise()).data.items;
            const taxonomies = (await deliveryClient.listTaxonomies().toAllPromise()).data.items;

            console.log(`Found '${yellow(types.length.toString())}' types`);
            console.log(`Found '${yellow(languages.length.toString())}' languages`);
            console.log(`Found '${yellow(taxonomies.length.toString())}' taxonomies \n`);

            // create content type models
            const contentTypesResult = await deliveryModelGenerator.generateModelsAsync({
                types: types,
                addTimestamp: config.addTimestamp,
                formatOptions: config.formatOptions,
                elementResolver: config.elementResolver,
                managementApiKey: config.apiKey,
                fileResolver: config.contentTypeFileResolver,
                contentTypeResolver: config.contentTypeResolver
            });

            // create taxonomy types
            const taxonomiesResult = await deliveryTaxonomyGenerator.generateTaxonomyTypesAsync({
                taxonomies: taxonomies,
                addTimestamp: config.addTimestamp,
                formatOptions: config.formatOptions,
                fileResolver: config.taxonomyTypeFileResolver,
                taxonomyResolver: config.taxonomyTypeResolver
            });

            // create project structure
            const projectModelResult = await deliveryProjectGenerator.generateProjectModel({
                addTimestamp: config.addTimestamp,
                formatOptions: config.formatOptions,
                languages: languages,
                taxonomies: taxonomies,
                types: types
            });

            // create barrel export
            const barrelExportCode = commonHelper.getBarrelExportCode({
                filenames: [
                    ...projectModelResult.filenames,
                    ...contentTypesResult.filenames,
                    ...taxonomiesResult.filenames
                ],
                formatOptions: config.formatOptions
            });
            const barrelExportFilename: string = 'index.ts';
            fs.writeFileSync(`./${barrelExportFilename}`, barrelExportCode);
            console.log(`\nBarrel export '${yellow(barrelExportFilename)}' created`);

        } else if (config.sdkType === 'management') {
            console.log('Not available yet');
        } else {
            throw Error(`Unsupported 'sdkType'. Supported values are: delivery, management`);
        }

        console.log(green(`\nModel generator completed`));
    } catch (error) {
        console.log(red(`Failed with error:`));
        console.log(error);
        throw error;
    }
}
