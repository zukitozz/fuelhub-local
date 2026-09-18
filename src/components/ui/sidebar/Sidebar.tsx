"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  IoNutritionOutline,
  IoDocumentTextOutline,
  IoAccessibilityOutline,
  IoTodayOutline,
  IoCashOutline,
  IoWalletOutline,
  IoCloseOutline,
  IoCarOutline,
  IoLogOutOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoSaveOutline,
  IoShirtOutline,
  IoTicketOutline,
  IoListOutline,
} from "react-icons/io5";
import { useUIStore } from "@/store";
import { logout } from "@/actions";

//import { useUIStore } from "@/store";
//import { logout } from "@/actions";

export const Sidebar = () => {
  const isSideMenuOpen = useUIStore((state) => state.isSideMenuOpen);
  const closeMenu = useUIStore((state) => state.closeSideMenu);

  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const isAdmin = session?.user.rol === "ADMIN_ROLE";
  
  return (
    <div>
      {/* Background black */}
      {isSideMenuOpen && (
        <div className="fixed top-0 left-0 w-screen h-screen z-10 bg-black opacity-30" />
      )}

      {/* Blur */}
      {isSideMenuOpen && (
        <div
          onClick={closeMenu}
          className="fade-in fixed top-0 left-0 w-screen h-screen z-10 backdrop-filter backdrop-blur-sm"
        />
      )}

      {/* Sidemenu */}
      <nav
        className={`fixed p-5 right-0 top-0 w-[500px] h-screen bg-white z-20 shadow-2xl transform transition-all duration-300 ${!isSideMenuOpen ? 'translate-x-full' : 'translate-x-0'}`}
      >
        <IoCloseOutline
          size={50}
          className="absolute top-5 right-5 cursor-pointer"
          onClick={() => closeMenu()}
        />

        {/* Input */}
        {/* <div className="relative mt-14">
          <IoSearchOutline size={20} className="absolute top-2 left-2" />
          <input
            type="text"
            placeholder="Buscar"
            className="w-full bg-gray-50 rounded pl-10 py-1 pr-10 border-b-2 text-xl border-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div> */}

        {/* Menú */}

        {isAuthenticated && (
          <>
            <Link
              href="/profile"
              onClick={() => closeMenu()}
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoPersonOutline size={30} />
              <span className="ml-3 text-xl">Cambiar contraseña</span>
            </Link>
            { !isAdmin && (
              <>
                <Link 
                  href="/cierreturno"
                  onClick={() => closeMenu()}
                  className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"            
                >
                  <IoSaveOutline size={30} />
                  <span className="ml-3 text-xl">Cerrar turno</span>                
                </Link>              
                <Link
                  href="/gastos"
                  onClick={() => closeMenu()}
                  className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
                >
                  <IoCashOutline size={30} />
                  <span className="ml-3 text-xl">Registro de gastos</span>
                </Link>
                <Link
                  href="/depositos"
                  onClick={() => closeMenu()}
                  className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
                >
                  <IoWalletOutline size={30} />
                  <span className="ml-3 text-xl">Depositos parciales</span>
                </Link>              
              </>
            )}

          </>
        )}

        {isAuthenticated && (
          <button
            className="flex w-full items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            onClick={() => logout()}
          >
            <IoLogOutOutline size={30} />
            <span className="ml-3 text-xl">Salir</span>
          </button>
        )}
        <div className="w-full h-px bg-gray-200 my-10" />
        <Link
          href="/admin/cierredia"
          onClick={() => closeMenu()}
          className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
        >
          <IoTodayOutline size={30} />
          <span className="ml-3 text-xl">Cerrar dia</span>
        </Link>        
        {isAdmin && (
          <>
            {/* Line Separator */}
            <Link
              href="/admin/products"
              onClick={() => closeMenu()}
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoShirtOutline size={30} />
              <span className="ml-3 text-xl">Productos</span>
            </Link>

            <Link
              href="/admin/reports"
              onClick={() => closeMenu()}
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoTicketOutline size={30} />
              <span className="ml-3 text-xl">Reportes</span>
            </Link>

            <Link
              href="/admin/usuarios"
              onClick={() => closeMenu()}
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoPeopleOutline size={30} />
              <span className="ml-3 text-xl">Usuarios</span>
            </Link>

            <Link
              href="/market"
              onClick={() => closeMenu()}
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoCarOutline size={30} />
              <span className="ml-3 text-xl">Vender</span>
            </Link> 

            <Link
              href="/admin/receptores"
              onClick={() => closeMenu()}
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoAccessibilityOutline size={30} />
              <span className="ml-3 text-xl">Clientes</span>
            </Link>

            <Link
              href="/admin/notasdespacho"
              onClick={() => closeMenu()}
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoDocumentTextOutline size={30} />
              <span className="ml-3 text-xl">Notas de despacho</span>
            </Link>

            <Link
              href="/admin/descuentos"
              onClick={() => closeMenu()}
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoNutritionOutline size={30} />
              <span className="ml-3 text-xl">Descuentos</span>
            </Link>

            <Link
              href="/admin/series"
              onClick={() => closeMenu()}
              className="flex items-center mt-5 p-2 hover:bg-gray-100 rounded transition-all"
            >
              <IoListOutline size={30} />
              <span className="ml-3 text-xl">Series</span>
            </Link>
          </>
        )}
      </nav>
    </div>
  );
};