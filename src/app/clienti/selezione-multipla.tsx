"use client";

import { useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";

export type Voce = { value: string; label: string };

// Selezione multipla con ricerca per nome. I valori scelti viaggiano nel form
// come campi nascosti con lo stesso `name` (FormData.getAll).
export function SelezioneMultipla({
  id,
  name,
  voci,
  iniziali,
  segnaposto,
  vuoto,
  descrittoDa,
  nonValido,
}: {
  id: string;
  name: string;
  voci: Voce[];
  iniziali: string[];
  segnaposto: string;
  vuoto: string;
  descrittoDa?: string;
  nonValido?: boolean;
}) {
  const ancora = useComboboxAnchor();
  const [scelti, setScelti] = useState<Voce[]>(() =>
    iniziali.map((v) => voci.find((x) => x.value === v) ?? { value: v, label: v }),
  );

  return (
    <>
      {scelti.map((v) => (
        <input key={v.value} type="hidden" name={name} value={v.value} />
      ))}
      <Combobox
        multiple
        items={voci}
        value={scelti}
        onValueChange={setScelti}
        isItemEqualToValue={(a: Voce, b: Voce) => a.value === b.value}
      >
        <ComboboxChips ref={ancora}>
          <ComboboxValue>
            {(valori: Voce[]) => (
              <>
                {valori.map((v) => (
                  <ComboboxChip key={v.value}>{v.label}</ComboboxChip>
                ))}
                <ComboboxChipsInput
                  id={id}
                  placeholder={valori.length === 0 ? segnaposto : undefined}
                  aria-invalid={nonValido || undefined}
                  aria-describedby={descrittoDa}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={ancora}>
          <ComboboxEmpty>{vuoto}</ComboboxEmpty>
          <ComboboxList>
            {(voce: Voce) => (
              <ComboboxItem key={voce.value} value={voce}>
                {voce.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </>
  );
}
