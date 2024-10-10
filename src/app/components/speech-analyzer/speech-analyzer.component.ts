import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AssemblyAI } from 'assemblyai';
import { APIService } from '../../services/API/api.service';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';


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
  styleUrls: ['./speech-analyzer.component.css']
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

  constructor(private apiService: APIService, private http: HttpClient) {}

  async ngOnInit() {
    await this.generateNewSpeechSample();
  }
  
  getUserAccountType(): number | null {
    console.log(this.apiService.getUserAccountType());
    
    return this.apiService.getUserAccountType()
    

  }

  saveSentence() {
    if (this.sentenceHolderText.trim()) {
      console.log("Saved sentence:", this.sentenceHolderText);
      // ton pa connect nalang labyo
      alert('Sentence saved successfully!');
    } else {
      alert('Please enter a valid sentence.');
    }
  }

  async generateNewSpeechSample() {
    const prompt = "Generate a unique and inspiring statement for speech practice, between 10 and 20 words. Do not include the name of the author, and do not enclose the sentence in quotation marks.";
  
    try {
      let generatedSample = await this.apiService.generateSpeechToRead(prompt);
      generatedSample = generatedSample.replace(/^"|"$/g, '').trim();
      this.speechSample = generatedSample;
      if (this.speechSample.toLowerCase() === "the quick brown fox jumps over the lazy dog." || !this.speechSample.trim()) {
        throw new Error("Invalid or default sentence generated.");
      }
    } catch (error) {
      console.error('Error generating speech sample:', error);
      this.speechSample = "The quick brown fox jumps over the lazy dog."; 
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


  parseAnalysisResult(analysisJson: string) {
    try {
        // Clean the JSON to ensure there are no unwanted characters
        const cleanJson = analysisJson.replace(/```json\n|\n```/g, '').trim();
        const parsedResult = JSON.parse(cleanJson);

        if (Array.isArray(parsedResult)) {
            // Extract actual analysis results and exclude summary
            this.analysisResult = parsedResult.filter(item => item.area && item.area !== 'summary');

            // Extract summary and set the summary and overall score
            const summaryItem = parsedResult.find(item => item.summary);
            if (summaryItem) {
                this.summary = summaryItem.summary.areas_for_improvement;
                // Clean the summary points and split them into an array
                this.improvementPoints = this.summary.split('-')
                    .map(point => point.replace(/\*\*/g, '').trim())
                    .filter(point => point.length > 0);
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
