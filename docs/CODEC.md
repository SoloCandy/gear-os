# GEAR.OS — Share Codec Field Reference

SHARE in the top bar shows the current inputs as a code (COPY CODE) or as a
link (COPY LINK, `…/#g=CODE`). LOAD CODE accepts either. Opening a link loads
the code once, opens the SHARE panel and clears the hash, so reloading the page
doesn't undo later edits.

## Format

```
URL-safe Base64( "<version>|<id>:<value>|<id>:<value>…" )
```

- `CODEC_VERSION` is currently **1**. Decoding a code from a *newer* version
  fails with a "reload the page" message. Older versions decode normally.
- Only fields that differ from `DEFAULT_INPUTS` are written. The all-defaults
  code is just `MQ` (`"1"`).
- Missing fields decode to `DEFAULT_INPUTS`. Unknown ids are ignored. Unusable values
  (bad number, out-of-list enum) fall back to the default. Numbers are clamped
  to the field's `min`/`max`. A code can never put the app in a state the UI
  couldn't reach.
- Base64 uses `-`/`_` with no padding, so a code can go in a URL hash as-is.

> **Rule: ids are permanent.** Never reuse an id for a different field, even
> after the field is removed. Move a removed field to "Retired" below and in
> the `CODEC_FIELDS` comment.

## Field table

| ID | Key | Type | Range / values |
|---|---|---|---|
| 1 | maxRpm | num | 1000–20000 |
| 2 | autoHp | bool | `1`/`0` |
| 3 | hpRpm | num | 500–20000 |
| 4 | autoTorque | bool | `1`/`0` |
| 5 | torqueRpm | num | 500–20000 |
| 6 | gearCount | int | 2–10 |
| 7 | topSpeed | num (mph) | 1–600 |
| 8 | tireRadius | num (mm) | 50–1000 |
| 9 | tireSize | str (URI-encoded) | ≤ 24 chars |
| 10 | tireInputMode | enum | 0 `size`, 1 `radius` |
| 11 | topGearOverride | num, nullable (`n`) | 0.48–6.00 |
| 12 | target1stSpeed | num (mph), nullable | 1–600 |
| 13 | target1stPct | num, nullable | 0–100 |
| 14 | target1stMode | enum | 0 `mph`, 1 `pct` |
| 15 | tightnessBias | num | −100–100 |

Enum values are stored by index. **Append new values only**; never reorder.

## Not shared

`metricUnits` and `dynoScale` are view preferences for each viewer, not part of the gearing.

## Retired — never reuse

(none)
