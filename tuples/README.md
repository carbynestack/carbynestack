# Pregenerated Tuple Files

In here there are two archives containing pregenerated tuples:

- `fake-crypto-material-0.1.zip` is for the CLI version `0.1-SNAPSHOT`
- `fake-crypto-material-0.2.zip` is for the CLI version `0.2-SNAPSHOT`

The tuple archives have been generated for the following settings (taken from
[here](https://github.com/carbynestack/carbynestack/blob/756a5c5882aa95292b21acabfcbb13230372db41/helmfile.d/0200.amphora.yaml))

- 2 parties

- `10000` tuples per type

- MAC keys for the GFp (prime field with prime number `p`):

  1. `-88222337191559387830816715872691188861`
  1. `1113507028231509545156335486838233835`

- MAC keys for the GF2N (finite field of characteristic 2 and cardinality 2^N):

  1. `0xb660b323e6`
  1. `0x4ec9a0343c`

- Bit length for GF2N: `40` bit

- Prime length: `128` bit

- Prime: `198766463529478683931867765928436695041`

- R: `141515903391459779531506841503331516415`

- rInv: `133854242216446749056083838363708373830`

You can also generate these tuple archives yourself. The following steps work
for MP-SPDZ v0.2.8. For older tuple files the folder names have been different,
so be careful there.

1. Check out [MP-SPDZ](https://github.com/data61/MP-SPDZ) at the proper version.

1. Run `make online` to build the `Fake-Offline.x` executable.

1. The files will be generated in the `PREP_DIR` directory (`Player-Data` by
   default).

1. If you want to re-use existing MAC keys, create the files

   - `echo "2 ${MAC_KEY_P_P0}" >> Player-Data/2-p-128/Player-MAC-Keys-p-P0`
   - `echo "2 ${MAC_KEY_P_P1}" >> Player-Data/2-p-128/Player-MAC-Keys-p-P1`
   - `echo "2 ${MAC_KEY_2_P0}" >> Player-Data/2-2-40/Player-MAC-Keys-2-P0`
   - `echo "2 ${MAC_KEY_2_P1}" >> Player-Data/2-2-40/Player-MAC-Keys-2-P1`

1. Either run `Scripts/setup-online` or directly `Fake-Offline.x`

```shell
# Template: 
# Fake-Offline.x --prime ${PRIME} --lgp ${PRIME_LENGTH} \
#   --lg2 ${2_LENGTH} --default {NUMBER_TUPLES_PER_TYPE} ${PLAYER_COUNT}
Fake-Offline.x --prime "198766463529478683931867765928436695041" --lgp 128 \
  --lg2 40 --default 10000 2
```

1. Currently, of all the tuples, only tuples from `Player-Data/2-p-128` and
   `Player-Data/2-2-128` can be uploaded to Castor. Therefore, the pregenerated
   tuple archives only contain these.
