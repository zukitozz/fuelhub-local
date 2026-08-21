import React from 'react'
import { reprintBilling } from '@/actions/billing/save-billing';
import { notify } from '@/utils';
import { IoPrintOutline } from 'react-icons/io5';
import { Session } from "next-auth";

interface Props {
  id: number;
  session: Session|null;
}

const PrintButton = ({ id, session }: Props) => {
  const handlerPrint = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    const { status, message } = await reprintBilling(session, id);
    const type = status ? 'success' : 'error';
    notify({ message, type });
  };

  // Definimos el color hexadecimal exacto de la imagen de referencia (#00A5A5)
  const livelyColor = "#00A5A5";

  return (
    <button 
      onClick={handlerPrint}
      className="flex items-center justify-center p-1 rounded-md transition-colors"
      title="Reimprimir comprobante"
      // Clase para Tailwind para que cambie el fondo en hover
      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = `${livelyColor}1A`)} // Fondo Turquesa suave (10% opacidad)
      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      onFocus={(e) => (e.currentTarget.style.backgroundColor = `${livelyColor}1A`)}
      onBlur={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <IoPrintOutline size={22} color={livelyColor} />
    </button>
  );
};

export default PrintButton;