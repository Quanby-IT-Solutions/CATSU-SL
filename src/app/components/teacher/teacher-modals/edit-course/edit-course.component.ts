import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom, lastValueFrom, tap } from 'rxjs';
import { APIService } from 'src/app/services/API/api.service';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';

interface InteractiveVideoAttachment {
  file: File;
  metadata: {
    type: string;
    quiz_id: string;
    timestamp: string;
  };
}

interface NonInteractiveAttachment {
  file: File;
  metadata: {
    type: 'normal';
    quiz_id: '';
    timestamp: '';
  };
}
interface Lesson {
  id?: string;
  lessonName: string;
  coverImage: File | string | null;
  fileupload: File | string | null;
  description: string;
  complexity: number;
  topics?: any[];
}

type FileType = 'mp4' | 'pdf' | 'any';

@Component({
  selector: 'app-edit-course',
  templateUrl: './edit-course.component.html',
  styleUrls: ['./edit-course.component.css']
})
export class EditCourseComponent implements OnInit {
  @Input() myCustomClass: string = '';
  @Input() languages: Map<string, any> = new Map<string, any>();
  @Input() info: any = null;
  lessons: Lesson[] = [];
  selectedFileName: string | undefined;
  audioDescription: string = '';
  showEditCourseModal = true; // Keeps track of the Edit Course Modal visibility
  isSaving: boolean = false;

  // Form
  language: string = '';
  mode: any = {};
  courseTitle: string = '';
  courseDesc: string = '';
  courseAudience: string = '';
  courseObjective: string = '';
  courseTechRequirements: string = '';
  courseImagePreview: string | ArrayBuffer | null = null;
  courseImageURL: string = '';
  showTopicModal: boolean = false;
  editingTopic: boolean = false;
  // newTopic: { title: string; details: string; attachments: File[]; topicId?: string } = {
  //   title: '',
  //   details: '',
  //   attachments: [],
  //   topicId: undefined,  // Initialize as undefined
  // };
  newTopic: {
    title: string;
    details: string;
    attachments: (File | string | InteractiveVideoAttachment)[];
    topicId?: string;
  } = {
    title: '',
    details: '',
    attachments: [],
    topicId: undefined,
  };
  currentLessonId: string | null = null;

  // Dropdowns and Modal States
  audienceOptions: string[] = ['Student', 'Teacher', 'Principal', 'Parent'];
  requirementsOptions: string[] = ['Internet', 'Phone', 'Tablet', 'Laptop'];
  selectedAudience: string[] = [];
  selectedRequirements: string[] = [];
  showAudienceDropdown = false;
  showRequirementsDropdown = false;

  showVideoModal: boolean = false;
  currentLesson: Lesson | null = null;
  currentFileType: FileType | null = null;
  interactiveVideoFile: File | null = null;
  interactiveVideoFileName: string = '';
  isInteractiveVideoMode: boolean = false;
  selectedQuiz: any = '';  // Initialize as an object instead of a string
  videoTimestamp: string = '';
  showVideoOptionsModal: boolean = false;
  showInteractiveVideoModal: boolean = false;

  constructor(public activeModal: NgbActiveModal, private API: APIService) {}


  ngOnInit(): void {

    this.getQuizzes();

    if (!this.info) {
      console.error('Course information is not available.');
      return;
    }

    console.log('Course Info:', this.info);

    this.courseTitle = this.info.title || '';
    this.courseDesc = this.info.description || '';
    this.courseObjective = this.info.objectives || '';

    this.selectedAudience = this.parseArrayString(this.info.targetAudience);
    this.selectedRequirements = this.parseArrayString(this.info.technicalRequirements);

    if (this.info.image) {
      this.courseImageURL = this.info.image;
      this.courseImagePreview = this.getURL(this.courseImageURL);
    }

    this.API.teacherCourseLessons(this.info.id).subscribe(
      (data) => {
        this.lessons = data.output.map((lesson: any) => ({
          id: lesson.id,
          lessonName: lesson.title,
          coverImage: lesson.background,
          fileupload: lesson.attachments,
          description: lesson.details,
          complexity: this.mapComplexity(Number(lesson.difficulty)),
          topics: [], // Initialize topics as an empty array
        }));

        // Fetch topics for each lesson
        this.lessons.forEach((lesson) => {
          if (lesson.id) {
            this.API.getTopics(lesson.id).subscribe(
              (topicsData) => {
                console.log(`Topics for Lesson ${lesson.id}:`, topicsData.output);
                // Sort topics by ID when they are fetched
                lesson.topics = topicsData.output.sort((a: any, b: any) => a.id - b.id);

                // Fetch attachments for each topic
                if (lesson.topics) {  // Check if topics are defined
                  lesson.topics.forEach((topic: any) => {
                    this.API.getTopicAttachments(topic.topicid).subscribe(
                      (attachmentsData) => {
                        if (attachmentsData.success) {
                          topic.attachments = attachmentsData.output.map((attachment: any) => attachment.attachment);
                          console.log(`Attachments for Topic ${topic.topicid}:`, topic.attachments); // Display attachments
                        } else {
                          console.error(`Error fetching attachments for topic ${topic.topicid}:`, attachmentsData.error || 'Unknown error');
                          this.API.failedSnackbar(`Failed to fetch attachments for topic ${topic.topicid}.`);
                        }
                      },
                      (error) => {
                        console.error(`Error fetching attachments for topic ${topic.topicid}:`, error);
                        this.API.failedSnackbar(`Failed to fetch attachments for topic ${topic.topicid}.`);
                      }
                    );

                  });
                }
              },
              (error) => {
                console.error(`Error fetching topics for lesson ${lesson.id}:`, error);
              }
            );
          }
        });
      },
      (error) => {
        console.error('Error fetching lessons:', error);
      }
    );
  }





  closeTopicModal(): void {
    this.showTopicModal = false;
    this.showEditCourseModal = true; // Show the Edit Course modal after closing the Edit Topic modal
  }





getFileProgress(){
  return this.API.uploadProgress;
}

async saveTopic(): Promise<void> {
  if (this.isSaving) {
    this.API.failedSnackbar('A save operation is already in progress.');
    return;
  }

  if (this.newTopic.title.trim() === '' || this.newTopic.details.trim() === '') {
    this.API.failedSnackbar('Title and Details are required.');
    return;
  }

  this.isSaving = true;
  this.API.showLoader();



  try {
    console.log('Saving topic:', this.newTopic);
    console.log('Current attachments:', this.newTopic.attachments);

    const attachments: any[] = [];

    for (const attachment of this.newTopic.attachments) {
      if (attachment instanceof File) {
        const serverLocation = uuidv4() + '-' + attachment.name;


        this.API.justSnackbar(`Uploading file`, this.uploadProgress);


        await this.API.uploadFileWithProgress(attachment, serverLocation);
        attachments.push({
          filePath: 'files/' + serverLocation,
          type: 'normal',
          metadata: null,
        });

        // Reset the snackbar to show success after upload
        this.API.justSnackbar('File uploaded successfully!', 3000);
      } else if (typeof attachment === 'object' && 'file' in attachment) {
        const serverLocation = uuidv4() + '-' + attachment.file.name;


        this.uploadInProgress = true;


        await this.API.uploadFileWithProgress(attachment.file,serverLocation);
        if (attachment.metadata.type === 'interactive') {
          attachments.push({
            filePath: 'files/' + serverLocation,
            type: 'interactive',
            metadata: {
              quiz_id: attachment.metadata.quiz_id,
              timestamp: attachment.metadata.timestamp,
            },
          });
        } else {
          attachments.push({
            filePath: 'files/' + serverLocation,
            type: 'normal',
            metadata: null,
          });
        }

        this.API.justSnackbar('Interactive file uploaded successfully!', 3000);
      } else if (typeof attachment === 'string') {
        // Existing file path, keep as is
        attachments.push({
          filePath: attachment,
          type: 'normal',
          metadata: null,
        });
      }
    }

    console.log('Processed attachments:', attachments);

    if (this.editingTopic && this.currentLessonId && this.newTopic.topicId) {
      // Updating existing topic
      const updateResult = await firstValueFrom(
        this.API.updateTopic(
          this.currentLessonId,
          this.newTopic.topicId,
          this.newTopic.title,
          this.newTopic.details
        )
      );

      if (updateResult.success) {
        // Clear existing attachments before adding new ones
        await this.clearExistingAttachments(this.newTopic.topicId);

        // Add new attachments
        await this.updateTopicAttachments(this.newTopic.topicId, attachments);

        this.API.successSnackbar('Topic and attachments updated successfully!');
        this.updateTopicsList();
        this.closeTopicModal();
      } else {
        throw new Error('Failed to update topic');
      }
    } else if (this.currentLessonId) {
      // Creating new topic
      const result = await firstValueFrom(
        this.API.createTopicWithAttachments(
          this.currentLessonId,
          this.newTopic.title,
          this.newTopic.details,
          attachments
        )
      );

      if (result.success) {
        console.log('Topic and attachments created successfully!', result);
        this.API.successSnackbar('Topic and attachments created successfully!');
        this.updateTopicsList();
        this.closeTopicModal();
      } else {
        throw new Error(result.error || 'Failed to create topic with attachments');
      }
    }
  } catch (error) {
    console.error('Error saving topic:', error);
    this.API.failedSnackbar(`Failed to ${this.editingTopic ? 'update' : 'create'} topic. Please try again.`);
  } finally {
    this.isSaving = false;
    this.API.hideLoader();
  }
}


private async clearExistingAttachments(topicId: string): Promise<void> {
  try {
    await firstValueFrom(this.API.deleteTopicAttachments(topicId));
  } catch (error) {
    console.error('Error clearing existing attachments:', error);
    throw new Error('Failed to clear existing attachments');
  }
}


private async updateTopicAttachments(topicId: string, attachments: any[]): Promise<void> {
  for (const attachment of attachments) {
    try {
      await firstValueFrom(
        this.API.createTopicAttachments(
          topicId,
          attachment.filePath,
          attachment.type,
          attachment.metadata
        )
      );
    } catch (error) {
      console.error('Error adding attachment:', error);
      throw new Error('Failed to add attachment');
    }
  }
}

attachFile(type: 'mp4' | 'pdf' | 'any'): void {
  if (type === 'mp4') {
    this.showVideoOptionsModal = true; // Show the interactive options when selecting video
  } else {
    this.saveNonInteractiveFile(); // Call the new function for non-interactive files
  }
}


saveInteractiveVideo(): void {
  if (this.interactiveVideoFile && this.selectedQuiz && this.videoTimestamp) {
    const interactiveAttachment: InteractiveVideoAttachment = {
      file: this.interactiveVideoFile,
      metadata: {
        type: 'interactive',
        quiz_id: this.selectedQuiz.id, // Ensure quiz_id is correctly set
        timestamp: this.videoTimestamp
      }
    };
    this.newTopic.attachments.push(interactiveAttachment); // Add to newTopic.attachments
    this.showInteractiveVideoModal = false; // Close the interactive video modal
    this.interactiveVideoFile = null; // Reset interactive video input
    this.selectedQuiz = ''; // Reset selected quiz
    this.videoTimestamp = ''; // Reset timestamp

    // Display a success message
    this.API.successSnackbar('Interactive video added successfully!');
  } else {
    this.API.failedSnackbar('Please fill all fields for interactive video.');
  }
}

saveNonInteractiveFile(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mp4, .pdf, *'; // Accept multiple file types

  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const selectedFile = target.files[0]; // Get the selected file

      try {
        // Generate a unique server location path
        const serverLocation = uuidv4() + '-' + selectedFile.name;

        // Upload the file and get the file path
        await this.API.uploadFileWithProgress(selectedFile, serverLocation);
        const filePath = 'files/' + serverLocation;

        // Push the file path to the attachments array
        const nonInteractiveAttachment: NonInteractiveAttachment = {
          file: selectedFile,
          metadata: {
            type: 'normal',  // Set the correct type to 'normal'
            quiz_id: '',     // Empty metadata for non-interactive files
            timestamp: ''    // Empty metadata for non-interactive files
          }
        };

        this.newTopic.attachments.push(nonInteractiveAttachment); // Add to newTopic.attachments

        // Save the attachment to the database with the type 'normal' and a NULL timestamp
        await firstValueFrom(
          this.API.createTopicAttachments(
            this.newTopic.topicId!,
            filePath,
            'normal',  // Ensure type is set to 'normal'
            null       // Set timestamp to NULL
          )
        );

        // Display a success message
        this.API.successSnackbar('Non-interactive file added successfully!');
      } catch (error) {
        console.error('Error uploading file:', error);
        this.API.failedSnackbar('Failed to upload the file. Please try again.');
      }
    } else {
      this.API.failedSnackbar('No file selected.'); // Inform the user if no file is selected
    }
  };

  input.click(); // Open the file dialog
}


deleteAttachment(index: number): void {
  if (this.editingTopic && this.newTopic.topicId) {
    // If we're editing an existing topic, we need to delete the attachment from the server
    const attachmentToDelete = this.newTopic.attachments[index];

    if (typeof attachmentToDelete === 'string') {
      // It's an existing file path, so we need to delete it from the server
      this.API.deleteTopicAttachments(this.newTopic.topicId).subscribe(
        (response) => {
          if (response.success) {
            this.newTopic.attachments.splice(index, 1);
            this.API.successSnackbar('Attachment deleted successfully!');
          } else {
            this.API.failedSnackbar('Failed to delete attachment. Please try again.');
          }
        },
        (error) => {
          console.error('Error deleting attachment:', error);
          this.API.failedSnackbar('Failed to delete attachment. Please try again.');
        }
      );
    } else if (attachmentToDelete && typeof attachmentToDelete === 'object' && 'file' in attachmentToDelete) {
      // It's a newly added file that hasn't been saved to the server yet
      this.newTopic.attachments.splice(index, 1);
      this.API.successSnackbar('Attachment removed successfully!');
    }
  } else {
    // If we're adding a new topic or the topic hasn't been saved yet,
    // we can simply remove the attachment from the array
    this.newTopic.attachments.splice(index, 1);
    this.API.successSnackbar('Attachment removed successfully!');
  }
}


handleVideoOption(option: 'video' | 'interactive'): void {
  this.showVideoOptionsModal = false; // Close options modal
  if (option === 'video') {
    this.uploadRegularVideo(); // Properly handle non-interactive video upload
  } else {
    this.showInteractiveVideoModal = true; // Open the interactive video modal for interactive videos
  }
}


uploadRegularVideo(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mp4'; // Accept only video files

  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const selectedFile = target.files[0]; // Get the selected file

      try {
        // Generate a unique server location path
        const serverLocation = uuidv4() + '-' + selectedFile.name;

        // Upload the file and get the file path
        // await this.API.uploadFileWithProgress(selectedFile, serverLocation);
        const filePath = 'files/' + serverLocation;

        // Create an attachment object for non-interactive video files
        const nonInteractiveAttachment: NonInteractiveAttachment = {
          file: selectedFile,
          metadata: {
            type: 'normal',  // Set type to 'normal' for non-interactive videos
            quiz_id: '',     // Empty metadata for non-interactive files
            timestamp: ''    // Empty metadata for non-interactive files
          }
        };

        this.newTopic.attachments.push(nonInteractiveAttachment); // Add to newTopic.attachments

        // Save the attachment to the database with the type 'normal' and a NULL timestamp
        await firstValueFrom(
          this.API.createTopicAttachments(
            this.newTopic.topicId!,
            filePath,
            'normal',  // Ensure type is set to 'normal'
            null       // Set timestamp to NULL
          )
        );

        // Display a success message
        this.API.successSnackbar('Video file added successfully as a normal attachment!');
      } catch (error) {
        console.error('Error uploading file:', error);
        this.API.failedSnackbar('Failed to upload the video file. Please try again.');
      }
    } else {
      this.API.failedSnackbar('No video file selected.'); // Inform the user if no file is selected
    }
  };

  input.click(); // Open the file dialog
}





isFile(file: any): file is File {
  return file instanceof File;
}

isString(file: any): file is string {
  return typeof file === 'string';
}

getFilenameFromPath(filePath: string): string {
  return filePath.split('>').length > 1 ? filePath.split('>')[1] : filePath;
}


openFile(file: string) {
  this.API.openFile(file);
}


// updateTopicsList(): void {
//   const lesson = this.lessons.find((lesson) => lesson.id === this.currentLessonId);
//   if (lesson) {
//     this.API.fetchLessonTopics(this.currentLessonId!).subscribe(
//       (topicsData) => {
//         // Sort topics by ID when they are fetched
//         lesson.topics = topicsData.output.sort((a: any, b: any) => a.id - b.id);
//         console.log('Updated topics list:', lesson.topics);
//       },
//       (error) => {
//         console.error('Error fetching updated topics:', error);
//       }
//     );
//   }
// }

updateTopicsList(): void {
  const lesson = this.lessons.find((lesson) => lesson.id === this.currentLessonId);
  if (lesson) {
    this.API.fetchLessonTopics(this.currentLessonId!).subscribe(
      (topicsData) => {
        lesson.topics = topicsData.output.sort((a: any, b: any) => a.id - b.id); // Sort topics by ID
        lesson.topics?.forEach((topic) => {
          this.API.getTopicAttachments(topic.topicid).subscribe(
            (attachmentsData) => {
              if (attachmentsData.success) {
                topic.attachments = attachmentsData.output.map((attachment: any) => attachment.attachment);
                console.log(`Updated Attachments for Topic ${topic.topicid}:`, topic.attachments); // Display updated attachments
              } else {
                console.error(`Error fetching attachments for topic ${topic.topicid}:`, attachmentsData.error || 'Unknown error');
                this.API.failedSnackbar(`Failed to fetch attachments for topic ${topic.topicid}.`);
              }
            },
            (error) => {
              console.error(`Error fetching attachments for topic ${topic.topicid}:`, error);
              this.API.failedSnackbar(`Failed to fetch attachments for topic ${topic.topicid}.`);
            }
          );
        });
      },
      (error) => {
        console.error('Error fetching updated topics:', error);
      }
    );
  }
}



openTopicModal(editing: boolean = false, topic?: any, lessonId?: string): void {
  this.showEditCourseModal = false; // Hide the Edit Course modal
  this.editingTopic = editing;
  this.showTopicModal = true;

  if (lessonId) {
    this.currentLessonId = lessonId;
    console.log('Current Lesson ID set to:', this.currentLessonId);
  }

  if (editing && topic) {
    // Parse attachments string into an array if necessary
    const parsedAttachments = typeof topic.attachments === 'string'
      ? topic.attachments.split(',').map((attachment: string) => attachment.trim())
      : topic.attachments || [];

    // Populate the modal with the topic's data
    this.newTopic = {
      title: topic.title || '',
      details: topic.details || '',
      attachments: parsedAttachments.map((attachment: any) =>
        typeof attachment === 'string' ? attachment : {
          file: attachment.file,
          metadata: attachment.metadata
        }
      ),
      topicId: topic.topicid || undefined,
    };
    console.log('Editing Topic Mode:', this.newTopic);
  } else {
    // Clear the modal for adding a new topic
    this.newTopic = { title: '', details: '', attachments: [], topicId: undefined };
    console.log('Adding a new Topic Mode');
  }
}




  toggleDropdown(type: string) {
    if (type === 'audience') {
      this.showAudienceDropdown = !this.showAudienceDropdown;
    } else if (type === 'requirements') {
      this.showRequirementsDropdown = !this.showRequirementsDropdown;
    }
  }

  onSelectAudience(option: string) {
    if (this.selectedAudience.includes(option)) {
      this.selectedAudience = this.selectedAudience.filter(aud => aud !== option);
    } else {
      this.selectedAudience.push(option);
    }
  }

  onSelectRequirement(option: string) {
    if (this.selectedRequirements.includes(option)) {
      this.selectedRequirements = this.selectedRequirements.filter(req => req !== option);
    } else {
      this.selectedRequirements.push(option);
    }
  }

  getURL(file: string): string {
    return this.API.getURL(file); // Use the same logic as in lessons component
  }


  parseArrayString(str: string): string[] {
    try {
      return JSON.parse(str.replace(/'/g, '"'));
    } catch (error) {
      console.error('Failed to parse string:', error);
      return [];
    }
  }

  mapComplexity(difficulty: number): number {
    return Math.round((difficulty * (3 / 5)) - 1);
  }

  // uploadCourseImage() {
  //   const input = document.createElement('input');
  //   input.type = 'file';
  //   input.accept = 'image/*';

  //   input.onchange = async (event: Event) => {
  //     const target = event.target as HTMLInputElement;
  //     if (target.files && target.files.length > 0) {
  //       const file = target.files[0];

  //       const reader = new FileReader();
  //       reader.onload = () => {
  //         this.courseImagePreview = reader.result;
  //       };
  //       reader.readAsDataURL(file);

  //       const filename = uuidv4() + '.' + file.name.split('.').pop();
  //       try {
  //         await firstValueFrom(this.API.uploadImage(file, filename));
  //         this.courseImageURL = 'files/' + filename;
  //         this.API.successSnackbar('Image uploaded successfully!');
  //       } catch (error) {
  //         this.API.failedSnackbar('Failed to upload image. Please try again.');
  //       }
  //     }
  //   };

  //   input.click();
  // }


  uploadProgress: number = 0; // Store the upload progress percentage
  uploadInProgress: boolean = false; // Track whether the upload is currently in progress



  uploadCourseImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const filename = uuidv4() + '.' + file.name.split('.').pop();

        // Reset progress and start file upload
        this.uploadProgress = 0;
        this.uploadInProgress = true;

        // Show the initial snackbar with 0% progress
        this.API.justSnackbar(`Uploading file... 0%`, 99999999999999); // Long duration until upload is done

        // Start the file upload and update the snackbar with progress
        this.API.uploadFileLoading(file, filename).subscribe({
          next: (progress: number) => {
            this.uploadProgress = progress; // Update the progress value

            // Update the snackbar message with current progress
            this.API.justSnackbar(`Uploading file... ${progress}%`, 99999999999999);
          },
          error: (error: any) => {
            this.uploadInProgress = false;
            this.API.justSnackbar('Failed to upload image. Please try again.', 3000); // Show error for 3 seconds
          },
          complete: () => {
            this.uploadInProgress = false;
            this.courseImageURL = 'files/' + filename;
            this.API.justSnackbar('Image uploaded successfully!', 3000); // Show success for 3 seconds
          },
        });
      }
    };

    input.click();
  }




  thisLesson() {
    const newLesson: Lesson = {
      lessonName: '',
      coverImage: null,
      fileupload: null,
      description: '',
      complexity: 1,
    };
    this.lessons.push(newLesson);
  }

  deleteQueue: any = [];

  delete(lesson: any) {
    if (this.lessons.length <= 1) {
      this.API.failedSnackbar('This course should at least have one lesson');
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Remove it!"
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteQueue.push(lesson.id);
        const index = this.lessons.indexOf(lesson);
        if (index > -1) {
          this.lessons.splice(index, 1);
        }
        Swal.fire({
          title: "Removed!",
          text: "Your file has been deleted.",
          icon: "success"
        });
      }
    });
  }

  getGradient(): string {
    return 'linear-gradient(to right, #ff9a9e, #fad0c4)';
  }

  listen(e: any) {
    this.mode.listen = e.target.value;
  }

  read(e: any) {
    this.mode.read = e.target.value;
  }

  speak(e: any) {
    this.mode.speak = e.target.value;
  }

  write(e: any) {
    this.mode.write = e.target.value;
  }

  onFileSelected(event: Event, lesson: Lesson, type: FileType) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && this.validateFileType(inputElement.files[0], type)) {
      lesson.fileupload = inputElement.files[0];
    }
  }

  validateFileType(file: File, type: FileType): boolean {
    const validTypes: Record<FileType, string[]> = {
      mp4: ['mp4'],
      pdf: ['pdf'],
      any: ['*'],
    };
    return validTypes[type].includes(file.type) || type === 'any';
  }

  previewVideo() {
    if (this.interactiveVideoFile) {
      const fileURL = URL.createObjectURL(this.interactiveVideoFile);
      window.open(fileURL, '_blank');
    }
  }



  onInteractiveVideoSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      this.interactiveVideoFile = target.files[0];
    }
  }

  importImage(event: Event, lesson: Lesson) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];
      if (!validImageTypes.includes(inputElement.files[0].type)) {
        this.API.failedSnackbar('Select valid image file type!');
        return;
      }
      lesson.coverImage = inputElement.files[0];
    }
  }

  setComplexity(complexity: number, lesson: Lesson) {
    lesson.complexity = complexity;
  }

  complexityOptions = ['Beginner', 'Intermediate', 'Advanced'];
  selectedcomplexity: string = 'Beginner';

  async submit() {
    const modeString = 'LRSW';

    if (this.courseTitle.trim() === '') {
      this.API.failedSnackbar('Course title should not be empty!');
      return;
    }

    if (this.courseObjective.trim() === '') {
      this.API.failedSnackbar('Course objective should not be empty!');
      return;
    }

    const defaultLanguage = 'English';
    const languageId = this.languages.get(defaultLanguage)?.id;

    if (!languageId) {
      this.API.failedSnackbar('Invalid language selected!');
      return;
    }

    const genID = this.info.id;  // Use existing ID for updating
    this.API.justSnackbar('Updating course, Please Wait...', 99999999999999);

    try {
      await lastValueFrom(
        this.API.updateCourse(
          genID,
          this.courseTitle,
          this.courseDesc,
          modeString,
          languageId,
          this.courseImageURL,
          this.courseObjective
        )
      );

      for (let lesson of this.lessons) {
        let attachments: string | undefined = undefined;
        let imageupload: string | undefined = undefined;
        const complexity = (Number(lesson.complexity) + 1) * (5 / 3);

        if (lesson.description.trim() === '') {
          lesson.description = '[NONE]';
        }
        if (lesson.fileupload && !(typeof lesson.fileupload === 'string')) {
          const fileparse = lesson.fileupload.name.split('.');
          const serverLocation = uuidv4() + '.' + fileparse[fileparse.length - 1];
          await this.API.uploadFileWithProgress(lesson.fileupload, serverLocation);
          const filelocation = 'files/' + serverLocation;
          const filename = lesson.fileupload.name;
          attachments = filelocation + '>' + filename;
        }

        if (lesson.coverImage && !(typeof lesson.coverImage === 'string')) {
          const fileparse = lesson.coverImage.name.split('.');
          const serverLocation = uuidv4() + '.' + fileparse[fileparse.length - 1];
          this.API.uploadImage(lesson.coverImage, serverLocation);
          const filelocation = 'files/' + serverLocation;
          imageupload = filelocation;
        }

        if (lesson.id) {
          await lastValueFrom(this.API.updateLesson(genID, lesson.id!, lesson.lessonName, lesson.description, complexity, attachments, imageupload));
        } else {
          await lastValueFrom(this.API.createLesson(genID, lesson.lessonName, lesson.description, complexity, attachments, imageupload));
        }
      }

      this.API.successSnackbar('Course updated successfully!');
      this.activeModal.close('update');
    } catch (error) {
      console.error('Error updating course:', error);
      this.API.failedSnackbar('Failed to update course. Please try again.');
    }
  }

  addLesson() {
    this.thisLesson();
  }

  getFilename(file: any) {
    if ((typeof file == 'string')) {
      return file.split('>')[1];
    } else {
      return file.name;
    }
  }

  getFilenamee(file: string): string {
    if (!file) return ''; // Handle empty or undefined file case
    return file.split('>').length > 1 ? file.split('>')[1] : file;
  }


  selectLanguage(langID: string) {
    this.language = langID!;
  }

  closeModal() {
    this.activeModal.close();
  }



  openFileSelector(lesson: Lesson, type: FileType, isInteractive: boolean = false) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = this.getFileAcceptType(type);
    input.onchange = (event: Event) => {
      this.onFileSelected(event, lesson, type);
      if (isInteractive && input.files && input.files[0]) {
        this.interactiveVideoFile = input.files[0];
        this.interactiveVideoFileName = input.files[0].name;
        this.isInteractiveVideoMode = true;
      }
    };
    input.click();
  }

  getFileAcceptType(type: FileType): string {
    switch (type) {
      case 'mp4':
        return '.mp4';
      case 'pdf':
        return '.pdf';
      default:
        return '*';
    }
  }



  // Quiz
  quizOptions: any = [];
  quiz: any = [];


  getQuizzes() {
    this.API.showLoader();
    this.API.teacherGetQuizzes().subscribe((data) => {
      this.quizOptions = data.output;
      console.log('quizes:', data);
      this.API.hideLoader();
    });
  }
}
