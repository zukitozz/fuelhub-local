"use server";
import { getCompra, getProductosParaCompra } from '@/actions';
import { ComprasForm } from "./ComprasForm";

interface Props {
    params: {
        id: string;
    }
}

export default async function CompraIdPage({ params }: Readonly<Props>) {
    const { id } = params;
    const compra = await getCompra(+id);
    const productos = await getProductosParaCompra();

    return (<ComprasForm compra={compra} productos={productos}/>);
}
