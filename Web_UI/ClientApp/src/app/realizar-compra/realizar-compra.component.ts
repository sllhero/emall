import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Item } from '../models/item';
import { EnvioService } from '../services/envio.service';
import { Envio } from '../models/envio.model';
import { Transaccion } from '../models/transaccion.model';
import { ItemService } from '../services/item.service';
import { Impuesto } from '../models/impuesto.model';
import { RealizarCompraService } from '../services/realizar-compra.service';
import { PromocionService } from '../services/promocion.service';
import { Promocion } from '../models/promocion';

declare var paypal;

@Component({
  selector: 'app-realizar-compra',
  templateUrl: './realizar-compra.component.html',
  styleUrls: ['./realizar-compra.component.css']
})
export class RealizarCompraComponent implements OnInit {

  @ViewChild('paypal', { static: true }) paypalElement: ElementRef;

  private idEnvio: number;
  private items: Item[];
  private envio: Envio;
  private total: number = 0;
  private precioDolar: number = 595.10;
  private error: any;
  private txtPago: string;
  private txtCodigo: string;
  private promocion: Promocion = null;
  private errorPromo: any;
  private promoAplicada: any;

  constructor(private route: ActivatedRoute, private envioService: EnvioService, private serviceItem: ItemService, private compraService: RealizarCompraService, private router: Router, private promocionService: PromocionService) { }

  ngOnInit() {
    this.obtenerItemsEnvio();
    this.paypalInit();
  }

   obtenerItemsEnvio() {
    this.idEnvio = parseInt(this.route.snapshot.queryParams['pago']);

     this.envioService.obtenerEnvio(this.idEnvio)
       .subscribe(async data => {
        this.envio = data

        for (let item of this.envio.items) {
          let impuesto: Impuesto = await this.serviceItem.ObtenerImpuestoItem(item.id_impuesto);
          item.precio = item.precio + (item.precio / 100 * impuesto.Porcentaje);
          this.total = this.total + item.precio;
        }

      });
   }

  paypalInit() {
    paypal
      .Buttons({
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [
              {
                description: 'Items de tienda',
                amount: {
                  currency_code: 'USD',
                  value: this.currencyConvertor()
                }
              },

            ]
          });
        },
        onApprove: async (data, actions) => {
          const order = await actions.order.capture();
          console.log(order);
          let transaccion: Transaccion = new Transaccion();
          transaccion.tipoPago = 'Paypal';
          transaccion.monto = this.total;

          this.compraService.realizarPago(this.envio, transaccion, this.promocion).subscribe(
            (response) => {
              this.router.navigate(['/']);
            },
            (error) => {
              this.error = error.error;
              window.scroll(0, 0);
            });
        },
        onError: err => {
          console.log(err);
        }
      })
      .render(this.paypalElement.nativeElement);
  }

  currencyConvertor(): string {
    return (this.total / this.precioDolar).toFixed(2).toString();
  }

  pagoSinpe() {
    let transaccion: Transaccion = new Transaccion();
    transaccion.tipoPago = 'Sinpe móvil';
    transaccion.monto = this.total;

    this.compraService.realizarPago(this.envio, transaccion, this.promocion).subscribe(
      (response) => {
        this.router.navigate(['/']);
      },
      (error) => {
        this.error = error.error;
        window.scroll(0, 0);
      });
  }

  obtenerPromocion() {
    this.promocionService.obtenerPromocionByCodigo(this.txtCodigo)
      .subscribe(data => {
        this.promocion = data;
        if (this.promocion == null) {
          this.errorPromo = 'La promoción no existe o ha expirado.';
        } else {
          this.errorPromo = null;
          this.promoAplicada = 'La promoción ' + this.promocion.nombre + ' ha sido aplicada';
          this.aplicarDescuento();
        }
      });
  }

  aplicarDescuento() {
    this.total = this.total - (this.total * (this.promocion.porcentaje / 100));
  }


}
