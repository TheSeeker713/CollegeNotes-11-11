import {expect,it} from 'vitest';
import {externalModelDirectory,verifyEmbeddingModel,verifyOcrModel} from '@collegenotes/importers';
it('rejects an absent drive or an ordinary internal directory masquerading as a mount',()=>{expect(()=>externalModelDirectory('/Volumes/CollegeNotes-missing-synthetic','/Volumes/CollegeNotes-missing-synthetic/models')).toThrow('external_ai_drive_unavailable');expect(()=>externalModelDirectory(process.cwd(),process.cwd()+'/.local/models')).toThrow('external_ai_drive_unavailable');});
it('uses verified existing MiniLM and OCR assets on the designated external SSD',()=>{expect(verifyEmbeddingModel()).toBe('/Volumes/MyceliaOS/AI/Models/CollegeNotes/minilm');expect(verifyOcrModel()).toBe('/Volumes/MyceliaOS/AI/Models/CollegeNotes/tesseract');});
