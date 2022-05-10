# Pregenerated Tuple Files

In here there are two Tuple-Archives:
- `fake-crypto-material-0.1.zip` is for the CLI version `0.1-SNAPSHOT`
- `fake-crypto-material-0.2.zip` is for the CLI version `0.2-SNAPSHOT`



The tuple files here were generated for the following settings (taken from [here](https://github.com/carbynestack/carbynestack/blob/756a5c5882aa95292b21acabfcbb13230372db41/helmfile.d/0200.amphora.yaml))

- Number of Players: 2
- `10000` Tuples per Type
- MAC-Keys for the GFP (Galois-Field with Prime Number): 
  1) `-88222337191559387830816715872691188861`
  2) `1113507028231509545156335486838233835` 
- MAC-Keys for the G2F (Field with 2^X number):
  1) `0xb660b323e6`
  2) `0x4ec9a0343c`
- Bit-Length for G2F: `40` Bits
- Prime Length: `128` Bits
- Prime: `198766463529478683931867765928436695041`
- R: `141515903391459779531506841503331516415`
- rInv: `133854242216446749056083838363708373830`


You can also generate these Tuple files yourself.
These steps work for MP-SPDZ v0.2.8, for older tuple files the folder names were different, so be careful there.

1) Check out [MP-SPDZ](https://github.com/data61/MP-SPDZ) at the proper Version
2) Run `make online` to build the `Fake-Offline.x` executable.
3) The files will be generated in the `PREP_DIR` directory (Player-Data by default)
4) If you want to re-use existing MAC-Values, create the files
    - `echo "2 ${MAC_KEY_P_P0}" >> Player-Data/2-p-128/Player-MAC-Keys-p-P0`
    - `echo "2 ${MAC_KEY_P_P1}" >> Player-Data/2-p-128/Player-MAC-Keys-p-P1`
    - `echo "2 ${MAC_KEY_2_P0}" >> Player-Data/2-2-40/Player-MAC-Keys-2-P0`
    - `echo "2 ${MAC_KEY_2_P1}" >> Player-Data/2-2-40/Player-MAC-Keys-2-P1 `
5) Either run `Scripts/setup-online` or directly `Fake-Offline.x`
    - Template: `Fake-Offline.x --prime ${PRIME} --lgp ${PRIME_LENGTH} --lg2 ${2_LENGTH} --default {NUMBER_TUPLES_PER_TYPE} ${PLAYER_COUNT}`
    - `Fake-Offline.x --prime "198766463529478683931867765928436695041" --lgp 128 --lg2 40 --default 10000 2`
6) Currently, of all the tuples, only tuples from `Player-Data/2-p-128` and `Player-Data/2-2-128` can be uploaded to Castor. Therefore the Pregenerated Tuple files only contain these values.
