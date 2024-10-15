import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-materials',
  templateUrl: './materials.component.html',
  styleUrls: ['./materials.component.css']
})
export class MaterialsComponent implements OnInit {
  task: any;
  assignmentTitle: string = 'Your Assignment Title';
  dueDate: string = 'Date of Submission';
  description: string = 'You can fetch the actual data from your backend or set them dynamically';
  attachments: any[] = []; // Array to store the parsed attachments
  teacherAttachments: { name: string, url: string }[] = []; // New: Teacher's attached files
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

  constructor(private API: APIService, private route: ActivatedRoute, private router: Router, private location: Location) {}

  ngOnInit(): void {
    const taskID = this.route.snapshot.paramMap.get('taskID');
    if (!taskID) {
      this.location.back();
    }

    this.API.showLoader();

    // Fetch task and assignment details
    this.API.studentGetAssignmentByID(taskID!).subscribe(data => {
      if (data.output.length <= 0) {
        this.location.back();
      }
      const taskData = data.output[0];
      this.teachername = `${taskData.firstname} ${taskData.lastname}`;
      this.task = taskData;

      // Parse teacher's attachments only for display in the "Materials from Teacher" section
      this.teacherAttachments = this.parseFileList(taskData.attachments);

      // Fetch student submission details
      this.API.studentAssignSubmitted(this.task.id).subscribe(submissionData => {
        if (submissionData.output.length > 0) {
          const submission = submissionData.output[0];

          // Only populate the uploadedFiles with files submitted by the student
          this.uploadedFiles = this.parseFileList(submission.attachments).map(file => file.name);

          this.comments = submission.comments;
          this.graded = submission.grade != null;
          this.grade = submission.grade;
          this.submitted = true;
          this.teacherComment = submission.feedback;
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

  parseFileList(fileList: string): { name: string, url: string }[] {
    if (!fileList) return [];

    // Split the file list on commas, then split each entry on '>'
    return fileList.split(',').map(file => {
      const [url, name] = file.split('>');

      // Ensure both URL and name are trimmed and valid
      return {
        url: url ? url.trim() : '',
        name: name ? name.trim() : 'Unknown File'
      };
    });
  }


  // Handle multiple file selection
  onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      Array.from(inputElement.files).forEach(file => {
        this.selectedFiles.push(file); // Add each file to selectedFiles array
        this.uploadedFiles.push(file.name); // Add file name for preview
      });
    }
  }

  // Drag-over event handler
  onDragOver(event: DragEvent): void {
    event.preventDefault(); // Prevent default behavior (open as link for some file types)
    this.isDragging = true; // Highlight the drop zone
  }

  // Drag-leave event handler
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false; // Remove highlight from drop zone
  }

  // Drop event handler for multiple files
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false; // Remove highlight from drop zone

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      Array.from(event.dataTransfer.files).forEach(file => {
        this.selectedFiles.push(file); // Add each dropped file to the selectedFiles array
        this.uploadedFiles.push(file.name); // Preview dropped file names
      });
      event.dataTransfer.clearData(); // Clear the drag data
    }
  }

  // Remove a selected file from the list
  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1); // Remove the file from the array
    this.uploadedFiles.splice(index, 1); // Remove the file name from the preview
  }

  // Submit assignment with multiple files
  submit(): void {
    if (this.submitted) {
      this.API.successSnackbar('Task is already submitted!');
      return;
    }

    if (this.selectedFiles.length === 0 && this.comments.trim() === '') {
      this.API.failedSnackbar('Please insert at least a comment or upload files.');
      return;
    }

    this.uploadingFiles = true; // Set flag to show that files are being uploaded
    let attachments: { filePath: string, fileName: string }[] = []; // Store JSON structure with short names and original names
    let comment: string | undefined = undefined;

    if (this.comments.trim() !== '') {
      comment = this.comments;
    }

    this.API.justSnackbar('Uploading files and submitting work...', 9999999);

    // Handle file uploads (multiple files)
    let uploadPromises = this.selectedFiles.map(file => {
      return new Promise<void>((resolve, reject) => {
        const fileParts = file.name.split('.');
        const fileExtension = fileParts[fileParts.length - 1]; // Get the file extension
        const shortFileName = this.generateShortID(2) + '.' + fileExtension; // Generate a short 2-character ID for the filename

        // Shorten the original filename to 10 characters (plus extension)
        const shortenedOriginalName = this.shortenFileName(file.name, 10);

        // Upload file with the newly generated short name
        this.API.uploadFileWithProgress(file, shortFileName)
          .then(() => {
            const fileLocation = 'files/' + shortFileName;

            // Store the short file path and shortened original name
            attachments.push({ filePath: fileLocation, fileName: shortenedOriginalName });
            resolve(); // Resolve when upload is complete
          })
          .catch((error) => {
            console.error('Error uploading file:', file.name, error);  // Better error logging
            this.API.failedSnackbar('Error uploading file: ' + file.name);
            reject(); // Reject in case of an error
          });
      });
    });

    // Once all file uploads are done, submit the assignment
    Promise.all(uploadPromises)
      .then(() => {
        // Convert attachments to a single concatenated string
        const attachmentsString = attachments.map(att => `${att.filePath}>${att.fileName}`).join(',');

        // Debugging log to verify what is being submitted
        console.log('Attachments being submitted:', attachmentsString);

        // Submit the assignment with comment and concatenated attachments string
        this.API.studentSubmitAssignment(this.task.id, comment, attachmentsString).subscribe({
          next: (response) => {
            console.log('Submission response from the server:', response); // Log the backend response for debugging

            // Proceed only if the submission was successful
            if (response.success) {
              this.submitted = true;
              this.uploadingFiles = false; // Reset the uploading flag

              // Debugging log to confirm successful submission
              console.log('Submission successful. Attachments:', attachmentsString);

              // Update uploadedFiles immediately and avoid adding duplicates
              this.uploadedFiles = attachments.map(att => att.fileName); // Extract filenames only for UI display

              // Reset the form state
              this.selectedFiles = [];
              this.comments = '';

              // Notify the teacher only if submission is truly successful
              this.API.pushNotifications(
                `${this.API.getFullName()} submitted a task`,
                `${this.API.getFullName()} submitted a task titled <b>'${this.task.title}'</b> for checking. Kindly check your task submission list for new submissions.`,
                this.task.teacherid
              );
              this.API.successSnackbar('Submitted output!');
            } else {
              // Handle backend errors, e.g., character limit exceeded
              console.error('Submission failed due to backend constraints:', response.output);
              this.API.failedSnackbar('Submission failed: ' + response.output);
              this.uploadingFiles = false; // Reset the uploading flag on error
            }
          },
          error: (error) => {
            console.error('Submission error:', error);
            this.API.failedSnackbar('Failed to submit assignment. Please try again.');
            this.uploadingFiles = false; // Reset the uploading flag on error
          }
        });
      })
      .catch(() => {
        this.API.failedSnackbar('Failed to upload all files. Please try again.');
        this.uploadingFiles = false; // Reset the uploading flag on error
      });
  }

  // Helper function to generate a short ID
  generateShortID(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Helper function to shorten a filename while keeping its extension
  shortenFileName(fileName: string, maxLength: number): string {
    const fileParts = fileName.split('.');
    const extension = fileParts.pop(); // Get the file extension
    const baseName = fileParts.join('.'); // Get the base name without extension

    if (baseName.length > maxLength) {
      return baseName.substring(0, maxLength) + (extension ? '.' + extension : '');
    }
    return fileName; // If the base name is already short enough, return as is
  }


  navigateBack(): void {
    this.router.navigate(['student/to-do']);
  }
}


  //   if( this.fileUpload != undefined){
  //     var fileparse =  this.fileUpload.name.split(".");
  //     var serverLocation = this.API.createID36()+ '.' + fileparse[fileparse.length-1];
  //     this.API.uploadFile( this.fileUpload, serverLocation);
  //     var filelocation = 'files/' + serverLocation;
  //     var filename =  this.fileUpload.name;
  //     attachments = filelocation+'>'+filename;
  //   }
  //   console.log(comment);
  //   this.API.studentSubmitAssignment(this.task.id, comment, attachments).subscribe(data=>{
  //     this.submitted= true;
  //     this.uploaded =attachments;
  //     this.API.successSnackbar('Submitted output!');
  //   });
  // }


  // You can fetch the actual data from your backend or set them dynamically
  // based on your application logic.

  // For example, if you have an API call, you can fetch the data in ngOnInit:
  // ngOnInit() {
  //   this.fetchAssignmentData();
  // }

  // fetchAssignmentData() {
  //   // Assuming you have a service to fetch data
  //   this.materialsService.getAssignmentData().subscribe(data => {
  //     this.assignmentTitle = data.title;
  //     this.dueDate = data.dueDate;
  //     this.description = data.description;
  //     this.instructions = data.instructions;
  //     this.attachments = data.attachments;
  //   });
  // }
// }
