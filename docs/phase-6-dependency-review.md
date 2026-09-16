# Phase 6 dependency review

## Historical September 10 proposal

Official npm registry metadata checked September 10, 2026: JSZip 3.10.2 and saxes 6.0.0 are current stable, already present in the lockfile. They will be declared directly for bounded archive inspection and non-executing XML parsing. PDF.js and Mammoth remain pinned. Do not render converted HTML or use the flagged transitive EPUB.js parser in an application path. EPUB spine/XML processing uses JSZip and saxes with explicit archive size/path limits and DTD rejection. Runtime checks use the pinned Node 24 environment.

Embedding candidate: Xenova/all-MiniLM-L6-v2, revision 751bff37182d3f1213fa05d7196b954e230abad9, quantized ONNX 22,972,370 bytes plus tokenizer/config files (approximately 24 MB total), Apache-2.0 model/runtime licensing to be confirmed from the model card before download. Transformers.js latest registry version is 4.2.0, Apache-2.0. Model downloads require the pending owner approval; no model has yet been downloaded.

Primary sources: [JSZip](https://github.com/Stuk/jszip), [saxes](https://github.com/lddubeau/saxes), [Transformers local configuration](https://huggingface.co/docs/transformers.js/main/custom_usage), [model files](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/main/onnx), [Tesseract local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md). Registry metadata is additional direct package evidence. No claim of real model quality before measured checks.


## September 16 completion review

The earlier pending-download paragraph is historical. `AUTH-P6-LOCAL-MODELS` and the current Phase 6 continuation cover the pinned English OCR/MiniLM assets, now downloaded and checksum verified within the 50 MB combined budget. Model card metadata confirms Apache-2.0 for MiniLM. Tokenizers 0.2.0 is Apache-2.0; ONNX Runtime 1.30.0 is MIT. Direct stable CPU runtime/tokenizer dependencies are used instead of Transformers.js, avoiding its unused web runtime dependency. Native telemetry is disabled before initialization.

The compatible development updates are recorded in [the setup record](development-setup-2026-09-15.md); the vulnerable EPUB transitive XML parser is overridden to 0.9.12. The app still uses bounded JSZip/Saxes extraction rather than executing EPUB content. The final npm audit reports zero known vulnerabilities. Real local inference and offline behavior are now verified; see [the Phase 6 production report](phase-6-production-report.md).
