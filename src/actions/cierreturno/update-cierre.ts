"use server";
import { ICierreTurnoResponse, IEditarCierreTurno } from "@/interfaces";
import { updateCierreTurnoTransaction } from '@/utils/db';
import { Session } from "next-auth";

export async function updateCierreTurno(session: Session|null, payload: IEditarCierreTurno): Promise<ICierreTurnoResponse> {
    return await updateCierreTurnoTransaction(session, payload);
}
