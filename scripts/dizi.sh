#!/usr/bin/env bash
# YouTube dizi derlemesi: tüm bölümleri "dizi modu"nda (soru/yarın kartı/yorum şeridi yok) render eder,
# her birini 1920x1080 yataya çevirir (ortada dikey görüntü, yanlarda bulanık arka plan), çızırtı kontrolü yapar,
# sonunda tek film + YouTube bölüm zaman damgaları üretir.
#   bash scripts/dizi.sh            # hepsi (önceden bitenler atlanır)
set -u
cd "$(dirname "$0")/.."
EPS="bolum1-1999 bolum2-sus bolum3-dolar bolum4-kac bolum5-kal bolum6-devam bolum7-kupa bolum8-kara bolum9-saniye bolum10-plan bolum11-turkgucu bolum12-ikili bolum13-gelecek bolum14-aciga-cik bolum15-geri-donus bolum16-bitcoin bolum17-dokunma bolum18-donan-final bolum19-iki-selim bolum20-final"
D=out/dizi; mkdir -p $D
LOG=$D/rapor.txt; : > $LOG.tmp
for s in $EPS; do
  if [ ! -f $D/$s-yatay.mp4 ]; then
    echo "== $s $(date +%H:%M)" | tee -a $D/ilerleme.log
    rm -rf /tmp/remotion-webpack-bundle-*
    KEEP_WAV=1 node scripts/render.mjs $s --dizi >> $D/ilerleme.log 2>&1 || { echo "RENDER HATA $s" | tee -a $D/ilerleme.log; continue; }
    ffmpeg -v error -y -i out/$s-dizi.mp4 -filter_complex \
      "[0:v]scale=1920:-2,crop=1920:1080,boxblur=30:3,eq=brightness=-0.18[bg];[0:v]scale=-2:1080[fg];[bg][fg]overlay=(W-w)/2:0,setsar=1,fps=30[v]" \
      -map "[v]" -map 0:a -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a copy -movflags +faststart $D/$s-yatay.mp4 \
      || { echo "YATAY HATA $s" | tee -a $D/ilerleme.log; continue; }
    python3 scripts/ses_kontrol.py out/$s-dizi.mp4 out/$s-dizi.master.wav > $D/$s-ses.txt 2>&1
    rm -f out/$s-dizi.master.wav
  fi
done
# Birleştir + zaman damgaları
: > $D/liste.txt; t=0; : > $D/zaman-damgalari.txt
for s in $EPS; do
  f=$D/$s-yatay.mp4; [ -f $f ] || { echo "EKSİK $s" >> $D/zaman-damgalari.txt; continue; }
  echo "file '$(realpath $f)'" >> $D/liste.txt
  title=$(python3 -c "import json,re;t=json.load(open('public/episodes/$s/episode.json'))['title'];m=re.search(r'Bölüm\s*(\d+)(?:\s*:\s*(.+))?',t);print(f'Bölüm {m.group(1)}'+(f': {m.group(2)}' if m.group(2) else ''))")
  printf "%02d:%02d %s\n" $((${t%.*}/60)) $((${t%.*}%60)) "$title" >> $D/zaman-damgalari.txt
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $f); t=$(python3 -c "print($t+$d)")
  echo "$s $(grep -h SONUÇ $D/$s-ses.txt 2>/dev/null)" >> $LOG.tmp
done
mv $LOG.tmp $LOG
ffmpeg -v error -y -f concat -safe 0 -i $D/liste.txt -c copy -movflags +faststart $D/gelecegi-bilen-adam-tum-sezon.mp4
echo "BİTTİ $(date +%H:%M) toplam ${t} sn" | tee -a $D/ilerleme.log
