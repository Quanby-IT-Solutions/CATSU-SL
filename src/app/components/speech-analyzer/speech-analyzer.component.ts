import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AssemblyAI } from 'assemblyai';
import { APIService } from '../../services/API/api.service';
import { first, firstValueFrom, lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

const client = new AssemblyAI({
  apiKey: environment.speech,
});

interface AnalysisResult {
  area: string;
  score: number;
  feedback: string;
}

@Component({
  selector: 'app-speech-analyzer',
  templateUrl: './speech-analyzer.component.html',
  styleUrls: ['./speech-analyzer.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms', style({ opacity: 1 })),
      ]),
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(-20px)', opacity: 0 }),
        animate('{{delay}}ms', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
    ]),
    trigger('staggered', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(-15px)' }),
          stagger('100ms', [
            animate('300ms', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
  ]
})
export class SpeechAnalyzerComponent implements OnInit {
  recording: boolean = false;
  mediaRecorder: any;
  audioChunks: any[] = [];
  analysisResult: AnalysisResult[] | null = null;
  summary: string = '';
  uploadProgress: number = 0;
  isAnalyzing: boolean = false;
  speechSample: string = '';
  transcriptText: string = '';
  averageScore: number = 0;
  currentDate: string = new Date().toDateString();
  averageScoreLabel: string = '';
  sentenceHolderText: string = '';
  usedStorage: any;
  isGenerating = false;
  selectedClass: string = '';
  classes: any[] = [];
  classSpeeches:any[] = [];
  selectedStudentClass:any = null;
  selectedStudentSpeech:any = null;
  savedSpeeches: { id: number, sentence: string }[] = [];
  editingIndex: number | null = null;

  constructor(private apiService: APIService, private http: HttpClient) {}

  ngOnInit() {
    // await this.generateNewSpeechSample();
     this.initialize();
  }


  getUserAccountType(): number | null {
    return this.apiService.getUserAccountType();
  }
  async initialize(){
    this.apiService.showLoader();
    if(this.getUserAccountType() == 0){
      await this.loadStudentCourses();
    }else{
      await this.loadClasses();
    }
    this.apiService.hideLoader();
  }

  createID32(): string {
    return this.apiService.createID32();
  }

  async loadStudentCourses() {
    try {
      const response = await this.apiService.getEnrolledCourses().toPromise();
      if (response.success) {
        this.classes = response.output;
      }
    } catch (error) {
      console.error('Error loading student courses:', error);
    }
  }


  semiLoading = false;

  async selectClass(classId: string) {
    this.selectedStudentClass = classId;
    await this.loadSpeeches(classId);
  }


  selectSpeech(sentence: string) {
    this.speechSample = sentence;
  }

  deselectClass(){
    this.selectedStudentClass = null;
  }

  deselectSpeech(){
    this.speechSample = ''
  }

  async loadSpeeches(classId: string) {
    try {
      const response = await this.apiService.getSpeechesInClass(classId).toPromise();
      if (response.success) {
        this.classSpeeches = response.output;
      }
    } catch (error) {
      console.error('Error loading speeches:', error);
    }
  }

  async loadClasses() {
    try {
      const response = await firstValueFrom(this.apiService.teacherAllClasses());
      if (response.success) {
        this.classes = response.output;
        if (this.classes.length > 0) {
          this.selectedClass = this.classes[0].id.toString();
          await this.loadSavedSpeeches();
        }
      } else {
        this.apiService.failedSnackbar('Unable to connect to the server.', 3000);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      this.apiService.failedSnackbar('Error loading classes.', 3000);
    }
  }



  loadSavedSpeeches() {
    if (this.selectedClass) {
      this.apiService.getSpeechesInClass(this.selectedClass).subscribe(
        (response) => {
          if (response.success) {
            this.savedSpeeches = response.output;
          } else {
            this.apiService.failedSnackbar('Unable to load saved speeches.', 3000);
          }
        },
        (error) => {
          console.error('Error loading saved speeches:', error);
          this.apiService.failedSnackbar('Error loading saved speeches.', 3000);
        }
      );
    }
  }

  clearSentence() {
    this.sentenceHolderText = '';
    this.editingIndex = null;
  }

  editSpeech(index: number) {
    const speech = this.savedSpeeches[index];
    this.sentenceHolderText = speech.sentence;
    this.editingIndex = index;
  }

  deleteSpeech(id: number) {
    this.apiService.post('delete_entry', {
      data: JSON.stringify({
        tables: 'speech_analyzer_items',
        conditions: {
          WHERE: {
            id: id
          }
        }
      })
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.apiService.successSnackbar('Speech deleted successfully.', 3000);
          this.loadSavedSpeeches();
        } else {
          this.apiService.failedSnackbar('Unable to delete speech.', 3000);
        }
      },
      error: (error) => {
        console.error('Error deleting speech:', error);
        this.apiService.failedSnackbar('Error deleting speech.', 3000);
      }
    });
  }
  saveSentence() {
    if (this.sentenceHolderText.trim() && this.selectedClass) {
      const id = this.editingIndex !== null ? this.savedSpeeches[this.editingIndex].id : this.apiService.generateManualId();

      this.apiService.createSpeechSentence(id, Number(this.selectedClass), this.sentenceHolderText).subscribe({
        next: (response) => {
          if (response.success) {
            this.apiService.successSnackbar('Sentence saved successfully!', 3000);
            this.loadSavedSpeeches();
            this.clearSentence();
          } else {
            this.apiService.failedSnackbar('Failed to save sentence. Please try again.', 3000);
          }
        },
        error: (error) => {
          console.error('Error saving sentence:', error);
          this.apiService.failedSnackbar('Error saving the sentence. Please try again.', 3000);
        }
      });
    } else {
      this.apiService.failedSnackbar('Please enter a valid sentence and select a class.', 3000);
    }
  }
  async generateNewSpeechSample() {
    this.isGenerating = true;
    const prompt = "Generate a unique and inspiring statement for speech practice, between 10 and 20 words. Do not include the name of the author, and do not enclose the sentence in quotation marks.";

    try {
      let generatedSample = await this.apiService.generateSpeechToRead(prompt);
      generatedSample = generatedSample.replace(/^"|"$/g, '').trim();
      this.speechSample = generatedSample;

      this.sentenceHolderText = this.speechSample;

      if (this.speechSample.toLowerCase() === "the quick brown fox jumps over the lazy dog." || !this.speechSample.trim()) {
        throw new Error("Invalid or default sentence generated.");
      }
    } catch (error) {
      console.error('Error generating speech sample:', error);
      this.speechSample = "The quick brown fox jumps over the lazy dog.";
      this.sentenceHolderText = this.speechSample;
    } finally {
      this.isGenerating = false;
    }
  }


  toggleRecording() {
    if (this.recording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.start();
      this.recording = true;

      this.mediaRecorder.ondataavailable = (event: any) => {
        this.audioChunks.push(event.data);
      };
    }).catch((err) => console.error('Microphone access denied:', err));
  }

  stopRecording() {
    if (this.mediaRecorder && this.recording) {
      this.mediaRecorder.stop();
      this.recording = false;

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.audioChunks = [];

        const audioFile = new File([audioBlob], 'speech.wav', {
          type: 'audio/wav',
        });

        await this.processAudio(audioFile);
      };
    }
  }

  goBack() {
    if (this.analysisResult) {
      this.analysisResult = null;
      this.summary = '';
      this.improvementPoints = [];
      this.averageScore = 0;
      this.averageScoreLabel = '';
    } else if (this.recording) {
      this.toggleRecording();
    } else if (this.speechSample) {
      this.speechSample = '';
    } else if (this.selectedStudentClass) {
      this.selectedStudentClass = null;
      this.classSpeeches = [];
    }
  }
  getIconForArea(area: string): string {
    const iconMap: { [key: string]: string } = {
      'pronunciation': 'https://cdn.builder.io/api/v1/image/assets/TEMP/6324a2aa39d53bb6ea1d5725c835799f148e798ab95ea51dc6b6e54dc155e684',
      'intonation': 'https://cdn.builder.io/api/v1/image/assets/TEMP/d3b7c11787c62fdc9dc8966f50aa73735fe1059a894b9694189a0eff1fa1d97e',
      'fluency': 'https://cdn.builder.io/api/v1/image/assets/TEMP/3ca7817d9c0f2d266e321face77ac9ddf391628c7af0f7883cf237e06c016429',
      'grammar': 'https://cdn.builder.io/api/v1/image/assets/TEMP/65c3e23cab9731ca08ca0da2159aef5f0fe3d9bd04ca1b19f2f6f3523fa880c5',
      'vocabulary': 'https://cdn.builder.io/api/v1/image/assets/TEMP/6324a2aa39d53bb6ea1d5725c835799f148e798ab95ea51dc6b6e54dc155e684'
    };

    return iconMap[area.toLowerCase()] || 'https://cdn.builder.io/api/v1/image/assets/TEMP/placeholder_icon';
  }

  async processAudio(audioFile: File) {
    this.isAnalyzing = true;
    try {
      const filename = `speech_${Date.now()}.wav`;
      await this.apiService.uploadFileWithProgressNoSnackbar(audioFile, filename);

      const fileUrl = `files/${filename}`;
      const audioId = this.apiService.generateManualId();
      const audioFileResponse = await lastValueFrom(this.apiService.createAudioFileWithId(audioId, fileUrl));
      const fullUrl = this.apiService.getURL(fileUrl);
      const transcript = await this.analyzeSpeech(fullUrl);

      this.transcriptText = transcript.text || 'No transcription available';

      const analysisJson = await this.processTranscript(transcript);

      this.parseAnalysisResult(analysisJson);
      if (this.analysisResult) {
        await this.createSpeechAnalyzerResultEntry(audioId, this.analysisResult);
        this.calculateAverageScore();
      }

    } catch (error) {
      console.error('Error processing audio:', error);
      this.analysisResult = null;
      this.summary = 'An error occurred while processing the audio.';
    } finally {
      this.isAnalyzing = false;
      this.uploadProgress = 0;
    }
  }

  async analyzeSpeech(fileUrl: string): Promise<any> {
    const transcript = await client.transcripts.create({ audio_url: fileUrl });
    return transcript;
  }

  async processTranscript(transcript: any): Promise<string> {
    const prompt = `The following is a transcription of the student's reading: "${transcript.text}".
    The original sentence to be read was: "${this.speechSample}".
    Please analyze the reading and provide a JSON output with the following format for each aspect:

    [
      {
        "area": "pronunciation",
        "score": 1-100,
        "feedback": "brief explanation for the score"
      },
      {
        "area": "intonation",
        "score": 1-100,
        "feedback": "brief explanation for the score"
      },
      {
        "area": "fluency",
        "score": 1-100,
        "feedback": "brief explanation for the score"
      },
      {
        "area": "grammar",
        "score": 1-100,
        "feedback": "brief explanation for the score"
      },
      {
        "area": "vocabulary",
        "score": 1-100,
        "feedback": "brief explanation for the score"
      },
      {
        "summary": {
          "areas_for_improvement": "Provide areas for improvement in bullet points",
          "overall_score": "average of the scores above"
        }
      }
    ]`;


    try {
      const analysisResult = await this.apiService.analyzeSpeech(prompt);
      return analysisResult;
    } catch (error) {
      console.error('Error during analysis:', error);
      throw error;
    }
  }


//   parseAnalysisResult(analysisJson: string) {
//     try {
//         const cleanJson = analysisJson.replace(/```json\n|\n```/g, '').trim();
//         const parsedResult = JSON.parse(cleanJson);

//         if (Array.isArray(parsedResult)) {
//             this.analysisResult = parsedResult.filter(item => item.area && item.area !== 'summary');

//             const summaryItem = parsedResult.find(item => item.summary);
//             if (summaryItem) {
//                 this.summary = summaryItem.summary.areas_for_improvement;
//                 this.improvementPoints = this.summary.split('-')
//                     .map(point => point.replace(/\*\*/g, '').trim())
//                     .filter(point => point.length > 0);
//                 this.averageScore = summaryItem.summary.overall_score;
//                 this.averageScoreLabel = this.getLabel(this.averageScore);
//             } else {
//                 throw new Error('Summary not found in parsed result');
//             }
//         } else {
//             throw new Error('Parsed result is not an array');
//         }
//     } catch (error) {
//         console.error('Error parsing analysis result:', error);
//         this.analysisResult = null;
//         this.summary = 'Error parsing analysis result.';
//     }
// }

parseAnalysisResult(analysisJson: string) {
  try {
    const cleanJson = analysisJson.replace(/```json\n|\n```/g, '').trim();
    const parsedResult = JSON.parse(cleanJson);

    if (Array.isArray(parsedResult)) {
      this.analysisResult = parsedResult.filter(item => item.area && item.area !== 'summary');

      const summaryItem = parsedResult.find(item => item.summary);
      if (summaryItem && summaryItem.summary) {
        this.summary = summaryItem.summary.areas_for_improvement || ''; 
        if (typeof this.summary === 'string') {
          this.improvementPoints = this.summary.split('-')
            .map(point => point.replace(/\*\*/g, '').trim())
            .filter(point => point.length > 0);
        } else {
          this.improvementPoints = [];
        }
        this.averageScore = summaryItem.summary.overall_score;
        this.averageScoreLabel = this.getLabel(this.averageScore);
      } else {
        throw new Error('Summary not found in parsed result');
      }
    } else {
      throw new Error('Parsed result is not an array');
    }
  } catch (error) {
    console.error('Error parsing analysis result:', error);
    this.analysisResult = null;
    this.summary = 'Error parsing analysis result.';
  }
}



  improvementPoints: string[] = [];
  parseImprovementPoints(summary: string): string[] {
    return summary
      .split('-')
      .map(point => point.trim())
      .filter(point => point.length > 0);
  }


  calculateAverageScore() {
    if (this.analysisResult && this.analysisResult.length > 0) {
      const totalScore = this.analysisResult.reduce((sum, result) => sum + (result.score || 0), 0);
      this.averageScore = Math.round(totalScore / this.analysisResult.length);
    } else {
      this.averageScore = 0;
    }

    // Set the average score label based on the calculated value
    this.averageScoreLabel = this.getLabel(this.averageScore);
  }

  getLabel(score: number): string {
    if (isNaN(score) || score < 0) {
      return 'Unknown';
    } else if (score >= 80) {
      return 'Advanced';
    } else if (score >= 40) {
      return 'Intermediate';
    } else {
      return 'Beginner';
    }
  }




  isScoreInvalid(score: number): boolean {
    return isNaN(score) || score < 0;
  }


 async createSpeechAnalyzerResultEntry(audioId: number, results: AnalysisResult[]): Promise<void> {
    const scores = results.reduce((acc, result) => {
      acc[result.area] = result.score;
      return acc;
    }, {} as Record<string, number>);

    try {
      const response = await lastValueFrom(this.apiService.createSpeechAnalyzerResult(
        audioId,
        scores['fluency'] || 0,
        scores['pronunciation'] || 0,
        scores['intonation'] || 0,
        scores['grammar'] || 0,
        scores['vocabulary'] || 0,
        this.summary
      ));
      console.log('Speech analyzer result created:', response);
    } catch (error) {
      console.error('Error creating speech analyzer result:', error);
    }
  }
}
