'use server';
import { IUserLogLogin } from '@/interfaces';
import { executeQuery } from '@/utils/db';

const HORAS_MAXIMAS_TURNO_ABIERTO = 12;

export async function saveLogin({ terminal, isla, jornada, ip, fecha_inicio, UsuarioId }: IUserLogLogin): Promise<string> {
    try {

        const new_loguin =await executeQuery<IUserLogLogin>(
            process.env.DB_DATABASE_AUXILIAR||"", `INSERT into Logins (terminal, isla, jornada, ip, fecha_inicio, UsuarioId) OUTPUT inserted.* values ('${terminal}', '${isla}', '${jornada}', '${ip}', '${fecha_inicio}', ${UsuarioId})`
            
        );          
        //Un turno dura 8 horas, asi que un login abierto de hace mas de 12 es de un turno anterior
        //que nunca se cerro: no se reutiliza, o el cierre mostraria como inicio el de dias atras.
        //Se compara contra la fecha del login recien creado para usar el mismo reloj.
        const prev_loguin = await executeQuery<IUserLogLogin[]>(
            process.env.DB_DATABASE_AUXILIAR||"", 
            `SELECT TOP 1 * FROM Logins WHERE UsuarioId = ${UsuarioId} and jornada = '${jornada}' and fecha_fin is null
             AND fecha_inicio >= DATEADD(hour, -${HORAS_MAXIMAS_TURNO_ABIERTO}, '${fecha_inicio}') ORDER BY id ASC`
        );
        if(prev_loguin.length === 0){
            return new_loguin.fecha_inicio;
        }
        return prev_loguin[0].fecha_inicio;

    } catch (error) {
        console.error("Error fetching getReceptores:");
        console.error(JSON.stringify(error));
        throw error;
    }
}