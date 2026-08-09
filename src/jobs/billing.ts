import { getBillingToProcess, saveBillingResponse } from '@/actions';
import { createOrderApiMiFact } from '@/utils';

export async function sendMiFactBilling(): Promise<void> {
    const billing = await getBillingToProcess();
    
    if(billing){
        const { comprobante } = await createOrderApiMiFact(billing);
        //Con await: si el proceso termina antes de guardar, el comprobante queda en
        //enviado = 0 y la siguiente corrida lo vuelve a mandar a MiFact
        await saveBillingResponse(comprobante);
    }
}