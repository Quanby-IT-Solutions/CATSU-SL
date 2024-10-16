import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { Location } from '@angular/common';

interface Attachment {
  filePath: string;
  fileName: string;
}



@Component({
  selector: 'app-materials',
  templateUrl: './materials.component.html',
  styleUrls: ['./materials.component.css']
})
export class MaterialsComponent implements OnInit {

  newAttachments: Attachment[] = [];
  existingAttachments: Attachment[] = []; // Track existing attachments
  removedFiles: string[] = []; // Track removed files


  task: any;
  assignmentTitle: string = 'Your Assignment Title';
  dueDate: string = 'Date of Submission';
  description: string = 'You can fetch the actual data from your backend or set them dynamically';
  attachments: any[] = []; // Array to store the parsed attachments
  teacherAttachments: Attachment[] = []; // Teacher's attached files
  uploadedFiles: string[] = []; // Array to store the files uploaded by the student
  selectedFiles: File[] = []; // Array to store files selected for upload
  comments: string = ''; // Student comments
  submitted = false; // Track if the assignment has been submitted
  overdue: boolean = false;
  graded: boolean = false;
  grade: number | null = null;
  teacherComment: string | null = null;
  teachername: string = '';
  isDragging = false; // Drag state
  uploadingFiles: boolean = false; // Track if files are being uploaded
  editMode: boolean = false; // New: Track if we're in edit mode
  originalSubmission: any = null; // New: Store original submission for cancellation

  constructor(private API: APIService, private route: ActivatedRoute, private router: Router, private location: Location) {}

  ngOnInit(): void {
    const taskID = this.route.snapshot.paramMap.get('taskID');
    if (!taskID) {
      this.location.back();
      return;
    }

    this.API.showLoader();

    // Fetch task and assignment details
    this.API.studentGetAssignmentByID(taskID).subscribe(data => {
      if (data.output.length <= 0) {
        this.location.back();
        return;
      }
      const taskData = data.output[0];
      this.teachername = `${taskData.firstname} ${taskData.lastname}`;
      this.task = taskData;

      // Parse teacher's attachments
      this.teacherAttachments = this.parseFileList(taskData.attachments);

      // Fetch student submission details
      this.API.studentAssignSubmitted(this.task.id).subscribe(submissionData => {
        if (submissionData.output.length > 0) {
          const submission = submissionData.output[0];

          // Parse and store existing attachments
          this.existingAttachments = this.parseFileList(submission.attachments);
          this.uploadedFiles = this.existingAttachments.map(att => att.fileName);

          this.comments = submission.comments;
          this.graded = submission.grade != null;
          this.grade = submission.grade;
          this.submitted = true;
          this.teacherComment = submission.feedback;

          this.originalSubmission = { ...submission };
        }
        this.API.hideLoader();
      });

      this.assignmentTitle = this.task.title;
      this.dueDate = this.parseDate(this.task.deadline);
      this.description = this.task.details;
    });
  }

  parseDate(date: string): string {
    const dateObject = new Date(date);
    this.overdue = (dateObject.getTime() - new Date().getTime()) / (1000 * 3600 * 24) < 0;
    return dateObject.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  openFile(fileUrl: string): void {
    this.API.openFile(fileUrl);
  }

  // parseFileList(fileList: string): { name: string, url: string }[] {
  //   if (!fileList) return [];

  //   // Split the file list on commas, then split each entry on '>'
  //   return fileList.split(',').map(file => {
  //     const [url, name] = file.split('>');

  //     // Ensure both URL and name are trimmed and valid
  //     return {
  //       url: url ? url.trim() : '',
  //       name: name ? name.trim() : 'Unknown File'
  //     };
  //   });
  // }

  onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      Array.from(inputElement.files).forEach(file => {
        this.selectedFiles.push(file); // Add each file to selectedFiles array
        this.uploadedFiles.push(file.name); // Add file name for preview
      });
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      Array.from(event.dataTransfer.files).forEach(file => {
        this.selectedFiles.push(file);
        this.uploadedFiles.push(file.name);
      });
      event.dataTransfer.clearData();
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.uploadedFiles.splice(index, 1);
  }

  submitOrEdit(): void {
    if (this.submitted && !this.editMode) {
      this.editMode = true;
      // Enable form fields for editing
    } else {
      this.submit();
    }
  }

  cancelEdit(): void {
    this.editMode = false;
    // Restore original submission data
    if (this.originalSubmission) {
      this.existingAttachments = this.parseFileList(this.originalSubmission.attachments);
      this.uploadedFiles = this.existingAttachments.map(file => file.fileName);
      this.comments = this.originalSubmission.comments;
      this.selectedFiles = []; // Clear any newly selected files
      this.removedFiles = []; // Clear the list of removed files
      this.newAttachments = []; // Clear any new attachments
    }
  }
  removeUploadedFile(index: number): void {
    const removedFile = this.uploadedFiles[index];
    this.uploadedFiles.splice(index, 1);

    this.removedFiles.push(removedFile);

    // Also remove from existingAttachments if it's there
    const existingIndex = this.existingAttachments.findIndex(att => att.fileName === removedFile);
    if (existingIndex !== -1) {
      this.existingAttachments.splice(existingIndex, 1);
    }
  }

  submit(): void {
    if (this.submitted && !this.editMode) {
      this.API.successSnackbar('Task is already submitted!');
      return;
    }

    if (!this.editMode && this.selectedFiles.length === 0 && this.comments.trim() === '') {
      this.API.failedSnackbar('Please insert at least a comment or upload files.');
      return;
    }

    this.uploadingFiles = true;
    this.newAttachments = []; // Reset newAttachments
    let comment: string | undefined = this.comments.trim() !== '' ? this.comments : undefined;

    this.API.justSnackbar(this.editMode ? 'Updating submission...' : 'Uploading files and submitting work...', 9999999);

    // Only upload new files if there are any selected
    let uploadPromises = this.selectedFiles.length > 0 ?
      this.selectedFiles.map(file => this.uploadFile(file)) :
      [Promise.resolve()];

    Promise.all(uploadPromises)
      .then(() => {
        // Combine existing attachments (minus removed ones) with new attachments
        const allAttachments: Attachment[] = [
          ...this.existingAttachments,
          ...this.newAttachments
        ];

        const attachmentsString = allAttachments.map(att => `${att.filePath}>${att.fileName}`).join(',');

        console.log('Attachments being submitted:', attachmentsString);

        const observable = this.editMode
          ? this.API.studentUpdateAssignment(this.task.id, comment, attachmentsString)
          : this.API.studentSubmitAssignment(this.task.id, comment, attachmentsString);

        observable.subscribe({
          next: (response: any) => {
            console.log('Submission response from the server:', response);

            if (response.success) {
              this.submitted = true;
              this.editMode = false;
              this.uploadingFiles = false;

              // Update uploadedFiles and existingAttachments
              this.uploadedFiles = allAttachments.map(att => att.fileName);
              this.existingAttachments = [...allAttachments];

              this.selectedFiles = [];
              this.removedFiles = []; // Reset removed files
              this.newAttachments = []; // Reset new attachments

              this.originalSubmission = {
                attachments: attachmentsString,
                comments: comment
              };

              if (!this.editMode) {
                this.API.pushNotifications(
                  `${this.API.getFullName()} submitted a task`,
                  `${this.API.getFullName()} submitted a task titled <b>'${this.task.title}'</b> for checking. Kindly check your task submission list for new submissions.`,
                  this.task.teacherid
                );
              }
              this.API.successSnackbar(this.editMode ? 'Submission updated!' : 'Submitted output!');
            } else {
              console.error('Submission failed due to backend constraints:', response.output);
              this.API.failedSnackbar('Submission failed: ' + response.output);
              this.uploadingFiles = false;
            }
          },
          error: (error: any) => {
            console.error('Submission error:', error);
            this.API.failedSnackbar('Failed to submit assignment. Please try again.');
            this.uploadingFiles = false;
          }
        });
      })
      .catch(() => {
        this.API.failedSnackbar('Failed to upload all files. Please try again.');
        this.uploadingFiles = false;
      });
  }

  uploadFile(file: File): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const fileParts = file.name.split('.');
      const fileExtension = fileParts[fileParts.length - 1];
      const shortFileName = this.generateShortID(2) + '.' + fileExtension;
      const shortenedOriginalName = this.shortenFileName(file.name, 10);

      this.API.uploadFileWithProgress(file, shortFileName)
        .then(() => {
          const fileLocation = 'files/' + shortFileName;
          this.newAttachments.push({ filePath: fileLocation, fileName: shortenedOriginalName });
          resolve();
        })
        .catch((error) => {
          console.error('Error uploading file:', file.name, error);
          this.API.failedSnackbar('Error uploading file: ' + file.name);
          reject(error);
        });
    });
  }

  parseFileList(fileList: string): Attachment[] {
    if (!fileList) return [];

    return fileList.split(',').map(file => {
      const [filePath, fileName] = file.split('>');
      return {
        filePath: filePath.trim(),
        fileName: fileName.trim()
      };
    });
  }





  generateShortID(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  shortenFileName(fileName: string, maxLength: number): string {
    const fileParts = fileName.split('.');
    const extension = fileParts.pop();
    const baseName = fileParts.join('.');

    if (baseName.length > maxLength) {
      return baseName.substring(0, maxLength) + (extension ? '.' + extension : '');
    }
    return fileName;
  }

  navigateBack(): void {
    this.router.navigate(['student/to-do']);
  }
}
