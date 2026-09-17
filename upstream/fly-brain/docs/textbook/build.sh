#!/bin/sh
# Build the textbook PDF via pandoc.
# Requires: pandoc + a LaTeX engine (tectonic / xelatex / pdflatex). Falls back to HTML.
cd "$(dirname "$0")"

FILES="00-title.md 01-introduction.md 02-data-and-ir.md 03-generic-structures.md \
04-circuits-tour.md 05-operators.md 06-ensemble-method.md 07-heading-lab.md 08-field-model.md \
09-cross-validation.md 10-phasor-circuit.md 11-mushroom-body.md 12-benchmark.md 13-compiler.md \
14-embodied.md 15-synthesis.md A-reproduction.md B-references.md"

# A text font with Greek glyphs, when the system has one; symbols come from pdf-header.tex.
MAINFONT=""
if fc-list 2>/dev/null | grep -q "STIX Two Text"; then MAINFONT="STIX Two Text"; fi

if command -v pandoc >/dev/null 2>&1; then
  for ENGINE in tectonic xelatex pdflatex; do
    if command -v "$ENGINE" >/dev/null 2>&1; then
      pandoc $FILES -o fly-brain-textbook.pdf --pdf-engine="$ENGINE" \
        -V geometry:margin=1in -V fontsize=11pt -V documentclass=report \
        ${MAINFONT:+-V "mainfont=$MAINFONT"} -H pdf-header.tex
      cp fly-brain-textbook.pdf ../../public/fly-brain-textbook.pdf
      echo "-> docs/textbook/fly-brain-textbook.pdf (engine: $ENGINE; copied to public/)"
      exit 0
    fi
  done
  echo "pandoc found but no PDF engine (tectonic/xelatex/pdflatex); producing HTML."
  pandoc $FILES -o fly-brain-textbook.html --standalone --toc
else
  echo "pandoc not found; install pandoc to build the book."
fi
