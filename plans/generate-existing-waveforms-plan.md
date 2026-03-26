# Generate existing sounds waveforms plan

## Checklist

- [x] Identifier les contenus `sound` existants et leur etat waveform.
- [x] Verifier la disponibilite des prerequis locaux (decodage audio CLI).
- [x] Executer une generation batch waveform pour les sons existants (sans ecraser les autres cles de `timestamp`).
- [x] Reporter un recapitulatif: generes, ignores, erreurs.

## Review

- Prerequis OK: `ffmpeg` disponible localement.
- Batch execute sur tous les contenus `sound` existants via script TSX (decode ffmpeg mono 22.05kHz, `points=2048`, puis `upsertContentWaveform`).
- Resultat: `total=3`, `generated=3`, `skippedExisting=0`, `skippedMissingFile=0`, `errors=0`.
- Couverture finale: `withWaveform=3`, `withoutWaveform=0`.
