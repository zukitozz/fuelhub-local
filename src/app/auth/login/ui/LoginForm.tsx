"use client";

import { SetStateAction, useEffect, useState } from 'react';

import { IoInformationOutline } from "react-icons/io5";
import { authenticate } from '@/actions';
import { useFormState, useFormStatus } from 'react-dom';

export const LoginForm = () => {
  const [state, dispatch] = useFormState(authenticate, undefined);
  
  const [selectedTurno, setSelectedTurno] = useState('TURNO1'); // Default value

  const handleChangeTurno = (event: { target: { value: SetStateAction<string>; }; }) => {
    setSelectedTurno(event.target.value);
  };

  useEffect(() => {
    if ( state === 'Success' ) {
      window.location.replace('/');
    }
  },[state]);

  return (
    <form action={dispatch} autoComplete="off" className="flex flex-col">
      <label htmlFor="usuario">Usuario</label>
      <input
        className="px-5 py-2 border bg-gray-200 rounded mb-5"
        type="text"
        id="usuario"
        name="usuario"
        autoComplete="off"
      />

      <label htmlFor="password">Contraseña</label>
      <input
        className="px-5 py-2 border bg-gray-200 rounded mb-5"
        // Se usa type="text" enmascarado por CSS: el navegador no detecta un campo de
        // contraseña y no ofrece guardarla (autocomplete="off" lo ignoran Chrome/Edge)
        type="text"
        id="password"
        name="password"
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore
        style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
      />

      <label htmlFor="turno">Turno</label>
      <label>
        <select className='px-5 py-2 border bg-gray-200 rounded mb-5 w-full' name='turno' value={selectedTurno} onChange={handleChangeTurno}>
          <option value="TURNO1">TURNO1</option>
          <option value="TURNO2">TURNO2</option>
          <option value="TURNO3">TURNO3</option>
        </select>
      </label>

      <div
        className="flex h-8 items-end space-x-1"
        aria-live="polite"
        aria-atomic="true"
      >
        {state && state !== "Success" && (
          <div className="flex flex-row mb-2">
            <IoInformationOutline className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-500">
              Credenciales no son correctas
            </p>
          </div>
        )}
      </div>

        <LoginButton />
      {/* <button type="submit" className="btn-primary">
        Ingresar
      </button> */}

      {/* divisor l ine */}
      {/* <div className="flex items-center my-5">
        <div className="flex-1 border-t border-gray-500"></div>
        <div className="px-2 text-gray-800">O</div>
        <div className="flex-1 border-t border-gray-500"></div>
      </div>

      <Link href="/auth/new-account" className="btn-secondary text-center">
        Crear una nueva cuenta
      </Link> */}
    </form>
  );
};

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <button className={`${pending ? "btn-disabled" : "btn-primary"}`} disabled={pending}
      type="submit">
      Ingresar
    </button>
  );
}