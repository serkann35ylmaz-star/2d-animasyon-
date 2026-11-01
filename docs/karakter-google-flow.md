# Karakter — Google Flow istemleri

Google Flow'da (labs.google/flow) **Nano Banana Pro** ya da **Imagen** ile üret. Önce 1. istemle karakter sayfasını
üret, beğendiğini indir. Sonraki sahnelerde bu görseli **referans görsel (ingredient)** olarak ekle ki karakter
her sahnede aynı kalsın. Çıkan görselleri bu sohbete yükle; ben 1080x1920'ye oturtup videoya yerleştiririm.

## 1) Karakter model sayfası (yatay, 16:9)

```
Character model sheet for a 2D adult animated series, used as the master reference for all future episodes. Plain warm light-grey background, clean studio layout, no scenery.

Subject: one recurring cartoon protagonist, a young man in his twenties. His head is a perfectly round, smooth, glossy white sphere with no ears, no hair and no nose. Big simple glossy black oval eyes with a small white highlight, short thick expressive black eyebrows, a small simple mouth. His hands are bare, simple white cartoon hands with four fingers, the same white as his head — NO gloves, no cuffs, no seams at the wrist. Thin black limbs.

Outfit (must stay identical in every view): a mustard-yellow ribbed knit beanie folded at the brim; an oversized dark navy bomber jacket with a burnt-orange inner lining visible at the collar and cuffs, ribbed black collar and waistband; a plain charcoal-grey t-shirt; loose black cargo pants with side pockets; chunky red-and-white high-top sneakers with white laces. No logos, no emblems, no text on the clothes.

Layout, left to right on one wide sheet: full-body front view, full-body three-quarter view, full-body back view, all standing in a relaxed neutral pose at the same scale. Along the bottom row: four head close-ups showing expressions — worried, shocked with a sweat drop, determined, sly smile.

Style: thick clean black ink outlines, flat cel shading with soft gradients, slightly gritty texture, modern adult-animation look, consistent proportions across every view. Soft even lighting with a subtle magenta rim light.

Constraints: no gloves, no text, no labels, no watermark, no extra characters, identical outfit and proportions in all views.
```

## 2) Sahne görselleri (dikey, 9:16)

Her sahne için `public/episodes/<bölüm>/prompts.md` dosyasındaki istemi kullan; karakter sayfasını referans ekle
ve başına şunu yaz:

```
Use the attached character sheet as the exact reference for the main character (same head, face, outfit, colors, proportions, no gloves). Vertical 9:16.
```
