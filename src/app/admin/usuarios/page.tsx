"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Encabezado from "@/components/Encabezado";
import Modal from "@/components/Modal";
import { Boton, Campo, Entrada, Insignia, Seleccion } from "@/components/ui";
import { FiEdit3, FiPlus, FiRefreshCw, FiUsers } from "@/components/iconos";
import { sileo } from "@/lib/toast";

type Programa = { id: number; nombre: string };
type Usuario = { id: string; email: string; nombres: string; rol: "ADMIN" | "COORDINADOR"; activo: boolean; programa: string | null };

const leerError = async (r: Response) => (await r.json().catch(() => ({}))) as { mensaje?: string; clave?: string };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nombres, setNombres] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<"ADMIN" | "COORDINADOR">("COORDINADOR");
  const [programaId, setProgramaId] = useState("");
  const [clave, setClave] = useState("");
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [claveTemporal, setClaveTemporal] = useState<{ email: string; clave: string } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/usuarios", { cache: "no-store" });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(datos.mensaje ?? "No fue posible cargar los usuarios.");
      setUsuarios(datos.usuarios ?? []);
      setProgramas(datos.programas ?? []);
    } catch (e) {
      sileo.error({ title: "Usuarios", description: (e as Error).message });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // Diferir el fetch deja que el primer render se confirme antes de que sus
    // resultados actualicen la tabla; React 19 detecta la cascada si se llama
    // al cargador directamente desde el efecto.
    const inicio = window.setTimeout(() => { void cargar(); }, 0);
    return () => window.clearTimeout(inicio);
  }, [cargar]);

  function cerrarModal() {
    if (guardando) return;
    setAbierto(false); setEditando(null); setNombres(""); setEmail(""); setRol("COORDINADOR"); setProgramaId(""); setClaveTemporal(null);
  }

  function abrirEdicion(usuario: Usuario) {
    setEditando(usuario);
    setNombres(usuario.nombres);
    setEmail(usuario.email);
    setRol(usuario.rol);
    setProgramaId(String(programas.find((p) => p.nombre === usuario.programa)?.id ?? ""));
    setAbierto(true);
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const r = await fetch("/api/usuarios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombres, email, rol, programaId: programaId ? Number(programaId) : null }),
      });
      const datos = await leerError(r);
      if (!r.ok) throw new Error(datos.mensaje ?? "No fue posible crear el usuario.");
      if (typeof datos.clave === "string") {
        setClaveTemporal({ email, clave: datos.clave });
      } else {
        sileo.success({ title: "Usuario creado", description: datos.mensaje });
        cerrarModal();
      }
      await cargar();
    } catch (error) {
      sileo.error({ title: "No se creó el usuario", description: (error as Error).message });
    } finally { setGuardando(false); }
  }

  async function actualizar(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setGuardando(true);
    try {
      const r = await fetch("/api/usuarios", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editando.id, nombres, email, rol, programaId: programaId ? Number(programaId) : null, activo: editando.activo }),
      });
      const datos = await leerError(r);
      if (!r.ok) throw new Error(datos.mensaje ?? "No fue posible actualizar el usuario.");
      sileo.success({ title: "Usuario actualizado", description: datos.mensaje });
      cerrarModal(); await cargar();
    } catch (error) {
      sileo.error({ title: "No se actualizó el usuario", description: (error as Error).message });
    } finally { setGuardando(false); }
  }

  async function cambiarEstado(usuario: Usuario) {
    try {
      const r = await fetch("/api/usuarios", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: usuario.id, activo: !usuario.activo }) });
      if (!r.ok) throw new Error((await leerError(r)).mensaje ?? "No fue posible cambiar el acceso.");
      await cargar();
    } catch (e) { sileo.error({ title: "Usuarios", description: (e as Error).message }); }
  }

  async function guardarClave(e: FormEvent) {
    e.preventDefault(); setGuardandoClave(true);
    try {
      const r = await fetch("/api/usuarios/mi-clave", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave }) });
      if (!r.ok) throw new Error((await leerError(r)).mensaje ?? "No fue posible guardar la contraseña.");
      setClave(""); sileo.success({ title: "Contraseña actualizada" });
    } catch (error) { sileo.error({ title: "Contraseña", description: (error as Error).message }); }
    finally { setGuardandoClave(false); }
  }

  return <main className="px-4 py-6 sm:p-8">
    <Encabezado titulo="Usuarios y accesos" descripcion="Administre las cuentas y permisos de acceso.">
      <Boton onClick={() => setAbierto(true)}><FiPlus aria-hidden /> Nuevo usuario</Boton>
    </Encabezado>
    <section className="tarjeta mb-6 overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-borde)] bg-cecar-50/60 p-5">
        <div><h2 className="font-bold text-[var(--color-texto)]">Accesos registrados</h2></div>
        <Boton variante="secundario" onClick={() => { setCargando(true); void cargar(); }} disabled={cargando} aria-label="Actualizar usuarios"><FiRefreshCw className={cargando ? "animate-spin" : ""} aria-hidden /></Boton>
      </div>
      {cargando ? <p className="p-5 text-sm text-[var(--color-texto-suave)]">Cargando usuarios…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-[var(--color-borde)] text-xs uppercase text-[var(--color-texto-suave)]"><tr><th className="p-4">Usuario</th><th className="p-4">Rol</th><th className="p-4">Programa</th><th className="p-4">Estado</th><th className="p-4 text-right">Acción</th></tr></thead><tbody>{usuarios.map((u) => <tr key={u.id} className="border-b border-[var(--color-borde)] last:border-0"><td className="p-4"><p className="font-semibold text-[var(--color-texto)]">{u.nombres}</p><p className="text-xs text-[var(--color-texto-suave)]">{u.email}</p></td><td className="p-4">{u.rol === "ADMIN" ? "Administrador" : "Coordinador"}</td><td className="p-4">{u.programa ?? "—"}</td><td className="p-4"><Insignia tono={u.activo ? "verde" : "neutro"}>{u.activo ? "Activo" : "Inactivo"}</Insignia></td><td className="p-4 text-right"><div className="flex justify-end gap-2"><Boton variante="secundario" onClick={() => abrirEdicion(u)} aria-label={`Editar ${u.nombres}`}><FiEdit3 aria-hidden /> Editar</Boton><Boton variante={u.activo ? "peligro" : "secundario"} onClick={() => void cambiarEstado(u)}>{u.activo ? "Desactivar" : "Activar"}</Boton></div></td></tr>)}</tbody></table></div>}
    </section>
    <section className="tarjeta max-w-2xl p-5"><div className="flex gap-3"><FiUsers className="mt-0.5 h-5 w-5 shrink-0 text-cecar-700" aria-hidden /><div><h2 className="font-bold text-[var(--color-texto)]">Mi contraseña de administrador</h2><p className="mt-1 text-sm text-[var(--color-texto-suave)]">Actualiza la contraseña con la que ingresas. Debe tener al menos 12 caracteres.</p><form onSubmit={guardarClave} className="mt-4 flex flex-wrap gap-3"><Entrada type="password" value={clave} onChange={(e) => setClave(e.target.value)} minLength={12} maxLength={128} required placeholder="Nueva contraseña" className="w-72"/><Boton type="submit" disabled={guardandoClave}>{guardandoClave ? "Guardando…" : "Guardar contraseña"}</Boton></form></div></div></section>
    <Modal abierto={abierto} onCerrar={cerrarModal} titulo={editando ? "Editar usuario" : "Crear usuario"}>{claveTemporal ? <div className="space-y-4"><p className="text-sm text-[var(--color-texto-suave)]">Entrega de pruebas para <strong className="text-[var(--color-texto)]">{claveTemporal.email}</strong>. Copie esta contraseña ahora: al cerrar no se volverá a mostrar.</p><output className="block rounded-lg border border-amber-200 bg-amber-50 p-4 font-mono text-base font-bold break-all text-amber-900">{claveTemporal.clave}</output><div className="flex justify-end"><Boton onClick={() => { setClaveTemporal(null); cerrarModal(); }}>Ya la copié</Boton></div></div> : <form onSubmit={editando ? actualizar : crear} className="space-y-4"><Campo etiqueta="Nombre completo" requerido><Entrada data-foco-inicial value={nombres} onChange={(e) => setNombres(e.target.value)} required maxLength={150}/></Campo><Campo etiqueta="Correo institucional" requerido><Entrada type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nombre@cecar.edu.co"/></Campo><Campo etiqueta="Rol" requerido><Seleccion opciones={[{ valor: "COORDINADOR", texto: "Coordinador" }, { valor: "ADMIN", texto: "Administrador" }]} value={rol} onChange={(e) => setRol(e.target.value as "ADMIN" | "COORDINADOR")}/></Campo>{rol === "COORDINADOR" && <Campo etiqueta="Programa" requerido><Seleccion opciones={programas.map((p) => ({ valor: String(p.id), texto: p.nombre }))} value={programaId} onChange={(e) => setProgramaId(e.target.value)} required/></Campo>}<div className="flex justify-end gap-3"><Boton variante="secundario" onClick={cerrarModal} disabled={guardando}>Cancelar</Boton><Boton type="submit" disabled={guardando}>{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear acceso"}</Boton></div></form>}</Modal>
  </main>;
}
