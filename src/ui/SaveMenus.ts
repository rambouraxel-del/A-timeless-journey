import type Phaser from 'phaser';
import { clearSlot, formatDate, formatPlayTime, getSettings, getSlots, SLOT_COUNT, setSettings } from '@/systems/SaveGame';
import { Modal } from './Modal';

// Fenetres partagees par l'ecran titre et le menu Pause : choix d'emplacement, confirmation, parametres.

export function openConfirm(
  scene: Phaser.Scene,
  options: { title: string; text: string; confirmLabel: string; onConfirm: () => void; onCancel?: () => void },
): Modal {
  return new Modal(scene, {
    title: options.title,
    text: options.text,
    layout: 'row',
    onDismiss: (m) => {
      m.close();
      options.onCancel?.();
    },
    buttons: [
      { label: 'Annuler', onTap: (_b, m) => { m.close(); options.onCancel?.(); } },
      { label: options.confirmLabel, onTap: (_b, m) => { m.close(); options.onConfirm(); } },
    ],
  });
}

export type SlotMode = 'load' | 'new' | 'erase';

const TITLES: Record<SlotMode, string> = { load: 'Continuer', new: 'Nouvelle partie', erase: 'Effacer une sauvegarde' };

// Liste des 3 emplacements. 'load' : seuls les emplacements remplis sont utilisables ;
// 'new' : tous, avec confirmation avant d'ecraser ; 'erase' : remplis uniquement, avec confirmation.
export function openSlotPicker(scene: Phaser.Scene, mode: SlotMode, onPick: (slot: number) => void, onBack?: () => void): Modal {
  const slots = getSlots();
  const back = () => onBack?.();
  const buttons = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const save = slots[i];
    const label = save
      ? `${i + 1} · ${save.place}\n${formatPlayTime(save.playTime)} · ${formatDate(save.savedAt)}`
      : `${i + 1} · Vide`;
    return {
      label,
      height: 46,
      enabled: mode === 'new' || save !== null,
      onTap: (_b: unknown, m: Modal) => {
        m.close();
        const reopen = () => openSlotPicker(scene, mode, onPick, onBack);
        if (mode === 'load' || (mode === 'new' && !save)) onPick(i);
        else if (mode === 'new') {
          openConfirm(scene, {
            title: 'Écraser ?',
            text: `L'emplacement ${i + 1} contient déjà une partie (${save!.place}, ${formatPlayTime(save!.playTime)}).\nLa remplacer ?`,
            confirmLabel: 'Remplacer',
            onConfirm: () => onPick(i),
            onCancel: reopen,
          });
        } else {
          openConfirm(scene, {
            title: 'Effacer ?',
            text: `La sauvegarde de l'emplacement ${i + 1} sera définitivement perdue.`,
            confirmLabel: 'Effacer',
            onConfirm: () => {
              clearSlot(i);
              onPick(i);
              reopen();
            },
            onCancel: reopen,
          });
        }
      },
    };
  });
  return new Modal(scene, {
    title: TITLES[mode],
    layout: 'column',
    onDismiss: (m) => {
      m.close();
      back();
    },
    buttons: [...buttons, { label: 'Retour', onTap: (_b, m) => { m.close(); back(); } }],
  });
}

// Parametres : effets d'ambiance (pris en compte au prochain lancement d'une salle) et, depuis
// l'accueil, effacement d'un emplacement.
export function openSettings(scene: Phaser.Scene, options: { allowErase: boolean; onBack: () => void; onErased?: () => void }): Modal {
  const label = () => `Effets d'ambiance : ${getSettings().ambient ? 'oui' : 'non'}`;
  const buttons: ConstructorParameters<typeof Modal>[1]['buttons'] = [
    {
      label: label(),
      onTap: (button) => {
        setSettings({ ambient: !getSettings().ambient });
        button.setLabel(label());
      },
    },
  ];
  if (options.allowErase) {
    buttons.push({
      label: 'Effacer une sauvegarde',
      onTap: (_b, m) => {
        m.close();
        const again = () => openSettings(scene, options);
        openSlotPicker(scene, 'erase', () => options.onErased?.(), again);
      },
    });
  }
  buttons.push({ label: 'Retour', onTap: (_b, m) => { m.close(); options.onBack(); } });
  return new Modal(scene, {
    title: 'Paramètres',
    layout: 'column',
    onDismiss: (m) => {
      m.close();
      options.onBack();
    },
    buttons,
  });
}
