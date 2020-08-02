import { Component, Input, OnInit } from '@angular/core';
import { UsuarioService } from '../../../services/usuario.service';
import { Router, ActivatedRoute } from "@angular/router";
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';
import { equalValueValidator } from '../../../helpers/equal-value.validator';
import { FileUploader, FileUploaderOptions, ParsedResponseHeaders } from 'ng2-file-upload';
import { CloudinaryOptions, CloudinaryUploader } from 'ng2-cloudinary';
import { Cloudinary } from '@cloudinary/angular-5.x';
import cloudinaryConfig from '../../../config';
import { Archivo } from '../../../models/Archivo';
import { Usuario } from '../../../models/usuario.model'

@Component({
  selector: 'app-editar-usuario',
  templateUrl: './editar-usuario.component.html',
  styleUrls: ['./editar-usuario.component.css']
})

export class EditarUsuarioComponent implements OnInit {
  @Input() integrarCon: string;

  private usuarioForm: FormGroup;
  private submitted: boolean = false;
  private error: object = null;
  private editComplete: boolean = false;
  private uploader: CloudinaryUploader;
  private imgUrl: any;
  private foto: Archivo;
  private isSendingData: boolean = false;
  private usuario: Usuario;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private usuarioService: UsuarioService,
    private cloudinary: Cloudinary) {
    this.uploader = new CloudinaryUploader(
      new CloudinaryOptions({
        cloudName: cloudinaryConfig.cloud_name,
        uploadPreset: cloudinaryConfig.upload_preset
      })
    );
  }

  ngOnInit() {
    this.usuarioForm = new FormGroup({
      Cedula: new FormControl('', [Validators.required, Validators.minLength(9)]),
      Nombre: new FormControl('', [Validators.required]),
      Apellido: new FormControl('', [Validators.required]),
      Correo: new FormControl('', [Validators.required, Validators.email]),
      Contrasena: new FormControl('', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]),
      ContrasenaConfirmar: new FormControl('', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]),
      Telefono: new FormControl('', [Validators.required]),
      Foto: new FormControl('', [Validators.pattern(/.*\.(gif|jpe?g|bmp|png|webp|tiff|eps)$/igm)])
    }, {
      validators: equalValueValidator('Contrasena', 'ContrasenaConfirmar')
    });

    this.obtenerDatosUsuario().then(() => {
      this.usuarioForm.controls['Cedula'].setValue(this.usuario.Cedula);
      this.usuarioForm.controls['Nombre'].setValue(this.usuario.Nombre);
      this.usuarioForm.controls['Apellido'].setValue(this.usuario.Apellido);
      this.usuarioForm.controls['Correo'].setValue(this.usuario.Correo);
      this.usuarioForm.controls['Telefono'].setValue(this.usuario.Telefono);
    });
  }

  obtenerDatosUsuario() {
    let usuarioId: number = +this.route.snapshot.paramMap.get('id');

    const obtenerDatos = new Promise((resolve, reject) => {
      this.usuarioService.obtenerUsuarioPorId(usuarioId)
        .subscribe(data => {
          this.usuario = data;
          resolve();
        }, (error) => {
            reject();
        });
    });

    return obtenerDatos;
  }

  validarFoto(files) {
    this.imgUrl = '';

    if (!this.usuarioForm.controls['Foto'].errors) {
      if (files.length === 0)
        return;

      let reader = new FileReader();
      reader.readAsDataURL(files[0]);

      reader.onload = (_event) => {
        this.imgUrl = reader.result;
      }
    }
  }

  subirFoto() {
    const upload = new Promise((resolve, reject) => {
      this.uploader.uploadAll();

      this.uploader.onSuccessItem = (item: any, response: string, status: number, headers: any) => {
        let res = JSON.parse(response);

        this.foto = new Archivo();
        this.foto.enlace = res.url;
        this.foto.nombre = res.original_filename + '.' + res.format;
        this.foto.tipo = 'Foto';

        resolve();
      }
    });

    return upload;
  }

  get f() {
    return this.usuarioForm.controls;
  }

  sanitizeData(data: FormGroup): Usuario {
    let usuarioEditado: Usuario = new Usuario();

    usuarioEditado.Id = this.usuario.Id;
    usuarioEditado.Nombre = this.usuarioForm.controls['Nombre'].value;
    usuarioEditado.Apellido = this.usuarioForm.controls['Apellido'].value;
    usuarioEditado.Cedula = this.usuarioForm.controls['Cedula'].value;
    usuarioEditado.Correo = this.usuarioForm.controls['Correo'].value;
    usuarioEditado.Telefono = this.usuarioForm.controls['Telefono'].value;
    usuarioEditado.Tipo = this.usuario.Tipo;

    return usuarioEditado;
  }

  editarUsuario() {
    this.usuarioService.editarUsuario(this.sanitizeData(this.usuarioForm))
      .subscribe(
        (response) => {
          this.isSendingData = false;

          if (this.integrarCon == null)
            this.router.navigate(['dashboard-admin/usuario/listar-usuario']);
          else {
            window.scroll(0, 0);
            this.editComplete = true;
          }
        },
        (error) => {
          this.isSendingData = false;
          this.error = error.error;

          if (!this.error.hasOwnProperty('message')) {
            this.error = { message: 'Error general al editar el usuario. Vuelva a intertarlo en unos minutos' };
          }

          window.scroll(0, 0);
        });
  }

  onSubmit() {
    this.submitted = true;

    if (this.usuarioForm.invalid) {
      window.scroll(0, 0);
      return;
    }

    if (this.usuarioForm.controls['Foto'].value != '') {
      this.subirFoto()
        .then(() => {
          this.isSendingData = true;
          this.editarUsuario();
        });
    } else {
      this.editarUsuario();
    }
  }
}