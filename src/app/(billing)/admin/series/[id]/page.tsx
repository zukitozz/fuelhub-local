"use server";
import { getSerie } from '@/actions';
import { initialSerieForm } from "@/utils";
import { SerieForm } from "./SerieForm";

interface Props {
  params: {
    id: string;
  };
}

export default async function SerieIdPage({ params }: Readonly<Props>) {
    const { id } = params;
    let serie = await getSerie(+id);

    if (!serie) {
        serie = initialSerieForm;
    }

    return (
        <SerieForm serie={serie} />
    );
}
