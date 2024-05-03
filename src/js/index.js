
//incluir libreria en proyecto
const Afip = require('@afipsdk/afip.js');
const afip = new Afip({ CUIT: 20409378472 });
const PDFDocument = require('pdfkit');
var QRCode = require('qrcode');
const fs = require('fs');
const { url } = require('inspector');

//Factura B
(async () => {

	/**
	 * Numero del punto de venta
	 **/
	const punto_de_venta = 1;

	/**
	 * Tipo de factura
	 **/
	const tipo_de_factura = 6; // 6 = Factura B
	const letra_factura="B";
	
	/**
	 * Número de la ultima Factura B
	 **/
	const last_voucher = await afip.ElectronicBilling.getLastVoucher(punto_de_venta, tipo_de_factura);
	console.log("Ultima factura ", last_voucher)

	/**
	 * Concepto de la factura
	 *
	 * Opciones:
	 *
	 * 1 = Productos 
	 * 2 = Servicios 
	 * 3 = Productos y Servicios
	 **/
	const concepto = 1;
	let opcion_concepto;

	switch (concepto) {
		case 1:
			opcion_concepto = "Productos";
			break;
		case 2:
			opcion_concepto = "Servicios";
			break;
		case 3:
			opcion_concepto="Productos";
			break;
		default:
			opcion_concepto="Tipo desconocido";
			break;
	}
	/**
	 * Tipo de documento del comprador
	 *
	 * Opciones:
	 *
	 * 80 = CUIT 
	 * 86 = CUIL 
	 * 96 = DNI
	 * 99 = Consumidor Final 
	 **/
	const tipo_de_documento = 99;
	let opcion_doc;
	switch (tipo_de_documento) {
		case 99:
			opcion_doc = "Consumidor Final";
			break;
		case 96:
			opcion_doc = "DNI";
			break;
		case 86:
			opcion_doc="CUIL";
			break;
		case 80:
			opcion_doc="CUIT";
			break;
		default:
			opcion_doc="Tipo desconocido";
	}

	/**
	 * Numero de documento del comprador (0 para consumidor final)
	 **/
	const numero_de_documento = 0;

	/**
	 * Numero de factura
	 **/
	const numero_de_factura = last_voucher+1;

	/**
	 * Fecha de la factura en formato aaaa-mm-dd (hasta 10 dias antes y 10 dias despues)
	 **/
	const fecha = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0];
	let fecha_=new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0];
	let partesFecha=fecha_.split("-");
	let fechaFormateada= partesFecha[2]+"/"+partesFecha[1]+"/"+partesFecha[0];

	/**
	 * Importe sujeto al IVA (sin icluir IVA)
	 **/
	const importe_gravado = 100;

	/**
	 * Importe exento al IVA
	 **/
	const importe_exento_iva = 0;

	/**
	 * Importe de IVA
	 **/
	const importe_iva = 21;

	/**
	 * Los siguientes campos solo son obligatorios para los conceptos 2 y 3
	 **/
	
	let fecha_servicio_desde = null, fecha_servicio_hasta = null, fecha_vencimiento_pago = null, fechaFormateada_desde=null;
	
	if (concepto === 2 || concepto === 3) {
		/**
		 * Fecha de inicio de servicio en formato aaaammdd
		 **/
		const fecha_servicio_desde = 20191213;


		// Extraer el año, mes y día de la fecha original
		// const fecha_servicio_desde_str = fecha_servicio_desde.toString();
		// const año = fecha_servicio_desde_str.substring(0, 4);
		// const mes = fecha_servicio_desde_str.substring(4, 6);
		// const dia = fecha_servicio_desde_str.substring(6, 8);

		// Construir la nueva cadena de fecha en el formato deseado
		// let fechaFormateada_desde = `${dia}/${mes}/${año}`;

		/**
		 * Fecha de fin de servicio en formato aaaammdd
		 **/
		const fecha_servicio_hasta = 20191213;
		

		/**
		 * Fecha de vencimiento del pago en formato aaaammdd
		 **/
		const fecha_vencimiento_pago = 20191213;

	}else{
		const fecha_servicio_desde="";
		const fecha_servicio_hasta="";
		const fecha_vencimiento_pago="";
	}

	const data = {
		'CantReg' 	: 1, // Cantidad de facturas a registrar
		'PtoVta' 	: punto_de_venta,
		'CbteTipo' 	: tipo_de_factura, 
		'Concepto' 	: concepto,
		'DocTipo' 	: tipo_de_documento,
		'DocNro' 	: numero_de_documento,
		'CbteDesde' : numero_de_factura,
		'CbteHasta' : numero_de_factura,
		'CbteFch' 	: parseInt(fecha.replace(/-/g, '')),	
		'FchServDesde'  : fecha_servicio_desde,
		'FchServHasta'  : fecha_servicio_hasta,
		'FchVtoPago'    : fecha_vencimiento_pago,
		'ImpTotal' 	: importe_gravado + importe_iva + importe_exento_iva,
		'ImpTotConc': 0, // Importe neto no gravado
		'ImpNeto' 	: importe_gravado,
		'ImpOpEx' 	: importe_exento_iva,
		'ImpIVA' 	: importe_iva,
		'ImpTrib' 	: 0, //Importe total de tributos
		'MonId' 	: 'PES', //Tipo de moneda usada en la factura ('PES' = pesos argentinos) 
		'MonCotiz' 	: 1, // Cotización de la moneda usada (1 para pesos argentinos)  
		'Iva' 		: [ // Alícuotas asociadas a la factura
			{
				'Id' 		: 5, // Id del tipo de IVA (5 = 21%)
				'BaseImp' 	: importe_gravado,
				'Importe' 	: importe_iva 
			}
		]
	};

	/** 
	 * Creamos la Factura 
	 **/
	const res = await afip.ElectronicBilling.createVoucher(data);
	console.log("res ",res)

	/**
	 * Mostramos por pantalla los datos de la nueva Factura 
	 **/

	// console.log({
	// 	'cae' : res.CAE, //CAE asignado a la Factura
	// 	'vencimiento' : res.CAEFchVto //Fecha de vencimiento del CAE

		
	// });
	const voucherInfo = await afip.ElectronicBilling.getVoucherInfo(numero_de_factura, punto_de_venta, tipo_de_factura);

	if(voucherInfo === null){
		console.log('El comprobante no existe');
	}
	


	
	const tipocodAut=voucherInfo.Resultado;
	const codAut=voucherInfo.CodAutorizacion;

	//datos codigo QR
	const datos = {
		'ver' 	: 1, // version del formato de los datos del comprobante
		'fecha' 	: fecha, 
		'cuit' 	: afip.CUIT,
		'ptoVta' 	: punto_de_venta,
		'tipoCmp' 	: tipo_de_factura,
		'nroCmp' : numero_de_factura,
		'importe' : importe_gravado + importe_iva + importe_exento_iva,
		'moneda' 	: 'PES',	
		'ctz'  : 1,
		'tipoDocRec'  : tipo_de_documento,
		'nroDocRec'    : numero_de_documento,
		'tipoCodAut' 	: tipocodAut,
		'codAut': codAut,
		
	};

	// //Crear código QR
	const facturaJsonString = JSON.stringify(datos);
	const DATOS_CMP_BASE_64 = Buffer.from(facturaJsonString).toString('base64');
	const qrCodeData = `https://www.afip.gob.ar/fe/qr/?p=${DATOS_CMP_BASE_64}`;
	// console.log(qrCodeData)
	QRCode.toDataURL(qrCodeData, function (err, url) {
		// console.log(url)
	  })
    QRCode.toFileStream(fs.createWriteStream('codigo_qr.png'), qrCodeData);
	// console.log("QR: ",DATOS_CMP_BASE_64)

	//Crear PDF
	// Descargamos el HTML de ejemplo (ver mas arriba)
	// y lo guardamos como bill.html

	const html = require('fs').readFileSync('./bill.html', 'utf8');

	
	// Nombre para el archivo (sin .pdf)
	const name = 'PDFprueba';
	
	// Opciones para el archivo
	const options = {
		width: 8, // Ancho de pagina en pulgadas. Usar 3.1 para ticket
		marginLeft: 0.4, // Margen izquierdo en pulgadas. Usar 0.1 para ticket 
		marginRight: 0.4, // Margen derecho en pulgadas. Usar 0.1 para ticket 
		marginTop: 0.4, // Margen superior en pulgadas. Usar 0.1 para ticket 
		marginBottom: 0.4 // Margen inferior en pulgadas. Usar 0.1 para ticket 
	};
	
	var iva=21;

	let partes_vto=res.CAEFchVto.split("-");
	let vto_formateado= partes_vto[2]+"/"+partes_vto[1]+"/"+partes_vto[0];



	// Creamos el PDF
	const pdfres = await afip.ElectronicBilling.createPDF({
		html: html.replace(/{punto_de_venta}/g,punto_de_venta)
				  .replace(/{numero_de_factura}/g,numero_de_factura)
				  .replace(/{letra_factura}/g,letra_factura)
				  .replace(/{tipo_de_documento}/g,opcion_doc)
				  .replace(/{CUIT}/g,afip.CUIT)
				  .replace(/{fecha}/g,fechaFormateada)
				  .replace(/{importe_total}/g,data.ImpTotal)
				  .replace(/{importe_iva}/g,importe_iva)
				  .replace(/{importe_gravado}/g,importe_gravado)
				  .replace(/{iva_percent}/g,iva)
				  .replace(/{importe_exento_iva}/g,data.ImpTrib)
				  .replace(/{CAE}/g,res.CAE)
				  .replace(/{CAE_vto}/g,vto_formateado)
				  .replace(/{fechaFormateada_desde}/g,fecha_servicio_desde)
				  .replace(/{fechaFormateada_hasta}/g,fecha_servicio_hasta)
				  .replace(/{fechaFormateada_vto}/g,fecha_vencimiento_pago),

		file_name: name,
		options: options});

	console.log(pdfres.file)

	const pdfBuffer = pdfres.file; // Reemplaza esto con el resultado real del PDF

    // Ruta donde deseas guardar el PDF
    const filePath = 'C:/Users/evadi/afip_project/factura.pdf';

    // Guardar el PDF localmente
    fs.writeFile(filePath, pdfBuffer, (err) => {
        if (err) {
            console.error('Error al guardar el archivo PDF:', err);
            return;
        }
        console.log('¡El archivo PDF se ha guardado correctamente!');
    });
	



}

)();


