import { Component, OnInit } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../general-modals/request-form/modal.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  // Dynamic variables for text and placeholders
  pageTitle: string = 'Stay Active and Engaged';
  pageSubtitles: string[] = ['Learn New Things', 'Online',];
  trainingProgramTitle: string = 'Catanduanes State University SpeechLab';
  trainingDescription: string = 'Empowering Speech Innovative Online Learning';
  welcomeText: string = 'Welcome! Learning starts here';
  emailPlaceholder: string = 'Email';
  passwordPlaceholder: string = 'Password';
  rememberMeText: string = 'Remember me';
  loginButtonText: string = 'LOGIN';
  noAccountText: string = 'No Account?';
  registerHereText: string = 'Register here';

  // Dynamic image properties
  imageSrc: string = 'assets/login/catsu.png';  // Image source
  imageAlt: string = 'QuanLab';  // Alt text for the image
  imageClass: string = 'z-10 w-3/4 max-w-xs p-2 sm:w-1/2 md:w-1/3 lg:w-2/5 xl:w-2/5';  // CSS classes for the image


  username =  this.API.getSavedEmail() ?? '';
  password = '';
  showPassword: boolean = false;
  constructor(
    private API: APIService,
    private router: Router,
    private modalService: NgbModal
  ) {}
  rememberMe:boolean = this.API.isLocalStorage();

  ngOnInit(): void {
    // console.log(this.API.getSavedEmail());
  }

  openModal() {
    const modalRef = this.modalService.open(ModalComponent);
    // You might pass data or perform any other operations here.
  }
  usernameHandler(event: any) {
    this.username = event.target.value;
  }
  passwordHandler(event: any) {
    this.password = event.target.value;
  }

  login() {
    if(this.rememberMe){
      this.API.useLocalStorage();
    }else{
      this.API.useSessionStorage();
    }
    this.API.login(this.username, this.password);
  }
  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }
}
