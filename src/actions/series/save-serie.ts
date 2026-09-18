'use server';
import { IDbResponse, ISerie } from '@/interfaces';
import { saveSerieTransaction } from '@/utils/db';

export async function saveSerie(serie: ISerie): Promise<IDbResponse> {
    return await saveSerieTransaction(serie);
}
