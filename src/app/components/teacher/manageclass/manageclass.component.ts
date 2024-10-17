import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NewclassComponent } from '../teacher-modals/newclass/newclass.component';
import { APIService } from 'src/app/services/API/api.service';
import { __classPrivateFieldIn } from 'tslib';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-manageclass',
  templateUrl: './manageclass.component.html',
  styleUrls: ['./manageclass.component.css'],

})
export class ManageclassComponent implements OnInit {


  getURL(file: string) {
    if (file.includes('http')) {
      return file;
    } else {
      return this.API.getURL(file);
    }
  }

  courses:Map<string, any> = new Map();;
  classes:any
  selectedClass:any;
  selectedStudent:any;

  selectedClassFilter: string = 'All Classes';
  selectedCourseFilter: string = 'All Courses';
  filteredStudents: any[] = [];
  uniqueClasses: string[] = [];
  uniqueCourses: string[] = [];


  constructor (
    private modalService: NgbModal,
    private API:APIService
  ){}
    openModal() {

      const modalRef = this.modalService.open(NewclassComponent);
      modalRef.componentInstance.courses = this.courses;
      modalRef.closed.subscribe(data=>{
        if(data=='update'){
          this.loadClasses();
        }
      });
      // You might pass data or perform any other operations here.
    }
    openEditModal(classID: string, className: string, classCode: string, daySchedule: string, timeSchedule: string, courseID: string) {
      const modalRef = this.modalService.open(NewclassComponent);
      modalRef.componentInstance.courses = this.courses;
      modalRef.componentInstance.data = {
        classID: classID,
        className: className,
        classCode: classCode,
        daySchedule: daySchedule,
        timeSchedule: timeSchedule,
        courseID: courseID
      };
      modalRef.closed.subscribe(data => {
        if (data === 'update') {
          this.loadClasses();
        }
      });
    }

    // start ton
    editing = false;
    students:any[]= [];
    student: any;



    ngOnInit(): void {
      this.loadClasses();
      this.loadCourses();
      this.loadStudents();
    }


    toggleEdit() {
      if (this.editing) {
        // Prepare the student object for update
        const studentToUpdate = {
          id: this.student.id,
          firstname: this.student.firstname,
          lastname: this.student.lastname,
          email: this.student.email,
          visibleid: this.student.visibleid,
          birthdate: this.student.birthdate,
          gender: this.student.gender,
          nationality: this.student.nationality,
          address: this.student.address
        };

        const obs$ = this.API.updateStudentInfo(studentToUpdate).subscribe(
          (response) => {
            this.API.successSnackbar("Student information updated successfully");
            this.updateStudentInList(studentToUpdate);
            obs$.unsubscribe();
          },
          (error) => {
            this.API.failedSnackbar("Failed to update student information");
            obs$.unsubscribe();
          }
        );
      }
      this.editing = !this.editing;
    }

    updateStudentInList(updatedStudent: any) {
      const index = this.students.findIndex(s => s.id === updatedStudent.id);
      if (index !== -1) {
        // Update the student in the main list
        this.students[index] = { ...this.students[index], ...updatedStudent };
        // Update filtered students if necessary
        this.applyFilters();
      }
    }

    loadStudents() {
      const obs$ = this.API.getStudentsTeacher().subscribe((data) => {
        if (data.success) {
          this.students = data.output;
          this.updateUniqueFilters();
          this.applyFilters(); // Apply filters initially to ensure correct initial state
        } else {
          this.API.failedSnackbar('Unable to load student data');
        }
        obs$.unsubscribe();
      });
    }

    updateUniqueFilters() {
      this.uniqueClasses = ['All Classes', ...new Set(this.students.map(student => student.class))];
      this.uniqueCourses = ['All Courses', ...new Set(this.students.map(student => student.course))];
    }

    applyFilters() {
      this.filteredStudents = this.students.filter(student => {
        const matchesClass = this.selectedClassFilter === 'All Classes' || student.class === this.selectedClassFilter;
        const matchesCourse = this.selectedCourseFilter === 'All Courses' || student.course === this.selectedCourseFilter;
        return matchesClass && matchesCourse;
      });
    }

    studentModal: boolean = false;
    editStudentModal: boolean = false;
    confirmDelete: boolean = false;
    editStudentProfile: boolean = false;


    openStudentModal() {
      this.studentModal = true;
    }

    closeStudentModal() {
      this.studentModal = false;
    }

    openEditStudentModal() {
      this.editStudentModal = true;
    }

    closeEditStudentModal() {
      this.editStudentModal = false;
    }



    editStudentProfileModal() {
      this.editStudentProfile = true;
    }

    closeStudentProfileModal() {
      if (this.editing) {
        // Discard changes
        const originalStudent = this.students.find(s => s.id === this.selectedStudentId);
        if (originalStudent) {
          this.student = JSON.parse(JSON.stringify(originalStudent));
        }
      }
      this.editStudentProfile = false;
      this.editing = false;
    }

    yesEditProfile() {
      this.editStudentProfile = false;
    }

    ekisEditProfile() {
      this.editStudentProfile = false;
    }

    editProfileInfo() {
      if (this.editing) {
          this.editing = false;
      } else {
          this.editing = true;
      }
  }



    selectedStudentId: string | null = null;

    viewStudentProfile(student: any) {
      this.selectedStudentId = student.id;
      this.student = JSON.parse(JSON.stringify(student)); // Create a deep copy
      this.editStudentProfile = true;
    }

    openConfirmDelete(student: any) {
      this.confirmDelete = true;
      this.student = student;
    }

    noConfirmDelete() {
      this.confirmDelete = false;
    }

    yesConfirmDelete() {
      this.API.deleteStudentFromCourse(this.student.class_id, this.student.id).subscribe(data => {
        this.confirmDelete = false;
        this.loadStudents();
        this.loadClasses();
        this.API.successSnackbar("Delete");
      })
    }




    editingEmail = false;



    noProfile() {
      return this.API.noProfile();
    }







    // end ton


    selectClass(selected:string){
      this.selectedClass = selected;
    }

    deleteClass(classID:string){

      Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!"
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Deleted!",
            text: "Your file has been deleted.",
            icon: "success"
          });
       
          this.API.deleteClass(classID).subscribe(data=>{
            this.loadClasses();
          });
        }
      });

    }

    parsetime(schedule: string | undefined): [string, string] {
      if (!schedule) {
        return ['', ''];
      }
      const datetime = schedule.split("(");
      if (datetime.length < 2) {
        return ['', ''];
      }
      const days = datetime[0].trim();
      const time = datetime[1].replace(/\)/g, "").trim();
      return [days, time];
    }


    loadCourses(){
      this.API.showLoader();
      this.API.teacherAllCourses().subscribe(data=>{
        if(data.success){
          for(let _class of data.output){
              this.courses.set(_class.id, _class);
          }
        }else{
          this.API.failedSnackbar('Failed loading courses');
        }
      });
    }

    loadClasses(){
      this.API.showLoader();
      this.API.teacherAllClasses().subscribe(data=>{
        if(data.success){
          this.classes = data.output;
        }else{
          this.API.failedSnackbar('Unable to connect to the server.', 3000);
        }
        this.API.hideLoader();
      });

    }


    missingInput  (classID: string, className: string, classCode: string, daySchedule: string, timeSchedule: string, courseID: string) {

      if (!classID || !className || !classCode || !daySchedule || !timeSchedule || !courseID) {

        this.API.failedSnackbar('Missing Input');
        return;
      }


    }

    updateLocalStorage(updatedStudent: any) {
      const currentUser = this.API.getUserData();
      if (currentUser && currentUser.id === updatedStudent.id) {
        // Update the local storage with new user data
        const updatedUserData = { ...currentUser, ...updatedStudent };
        this.API.updateLocalUserData(JSON.stringify(updatedUserData));
      }
    }
}
