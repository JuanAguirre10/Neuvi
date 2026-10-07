"use client";

import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, useServerForm } from "@/components/common/form";
import { CalendarColorPicker } from "@/features/equipo/color-picker";
import { updateProfileAction } from "./actions";

export type ProfileValues = {
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  licenseNumber: string | null;
  calendarColor: string;
  isProfessional: boolean;
};

export function ProfileForm({ profile }: { profile: ProfileValues }) {
  const { state, pending, onSubmit } = useServerForm(updateProfileAction, {
    onSuccess: (s) => toast.success(s.message ?? "Perfil actualizado."),
  });
  const e = state.fieldErrors ?? {};

  return (
    <form method="post" onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="font-semibold text-brand-navy-deep">Datos personales</CardTitle>
          <CardDescription>Así te verán tus colegas y pacientes en la agenda y en los mensajes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormMessage message={state.ok ? undefined : state.message} />
          <Field label="Nombre completo" htmlFor="name" error={e.name} required>
            <Input id="name" name="name" autoComplete="name" defaultValue={profile.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo electrónico" htmlFor="email" hint="Para cambiarlo, pídeselo al administrador.">
              <Input id="email" value={profile.email} disabled readOnly />
            </Field>
            <Field label="Celular" htmlFor="phone" error={e.phone}>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="987 654 321"
                defaultValue={profile.phone ?? ""}
              />
            </Field>
          </div>

          {profile.isProfessional ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Especialidad" htmlFor="specialty" error={e.specialty}>
                  <Input id="specialty" name="specialty" placeholder="Psicología clínica" defaultValue={profile.specialty ?? ""} />
                </Field>
                <Field label="N.º de colegiatura (C.Ps.P.)" htmlFor="licenseNumber" error={e.licenseNumber}>
                  <Input
                    id="licenseNumber"
                    name="licenseNumber"
                    inputMode="numeric"
                    placeholder="12345"
                    defaultValue={profile.licenseNumber ?? ""}
                  />
                </Field>
              </div>
              <Field label="Color en la agenda" error={e.calendarColor} hint="Identifica tus citas en la agenda del centro.">
                <CalendarColorPicker idPrefix="perfil-color" defaultValue={profile.calendarColor} />
              </Field>
            </>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton pending={pending} pendingText="Guardando…">
            Guardar cambios
          </SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
