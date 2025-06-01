import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// Placeholder para autenticación/lógica de usuario.
const auth = (req: Request) => ({ id: "fakeUserId" }); // Fake auth - !!! REPLACE THIS !!!

export const ourFileRouter = {
  propertyDocument: f({
    pdf: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      // Middleware using the auth placeholder
      const user = await auth(req);
      if (!user || !user.id) throw new UploadThingError("Unauthorized");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      console.log("file key", file.key);

      return { uploadedBy: metadata.userId, fileKey: file.key };
    }),
    
  propertyImage: f({
    image: {
      maxFileSize: "32MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      // TODO: Adaptar autenticación para Supabase
      return { 
        propertyId: req.headers.get("x-property-id")
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // TODO: Implementar lógica de guardado en Supabase si es necesario
      return { 
        url: file.url,
        propertyId: metadata.propertyId
      };
    }),

  // Nueva ruta para adjuntos de email
  emailAttachment: f({
    blob: { // Permite cualquier tipo de archivo
      maxFileSize: "32MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      // TODO: Adaptar autenticación para Supabase
      return { 
        emailId: req.headers.get("x-email-id"),
        filename: req.headers.get("x-filename"),
        contentType: req.headers.get("x-content-type")
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // TODO: Implementar lógica de guardado en Supabase si es necesario
      return { 
        url: file.url,
        emailId: metadata.emailId,
        filename: metadata.filename,
        contentType: metadata.contentType
      };
    }),

  // >>> AÑADIR NUEVO ENDPOINT PARA DOCUMENTOS DE CLIENTE <<<
  clientDocument: f({
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
    // Podrías añadir otros tipos si es necesario (jpg, png, etc.)
    // image: { maxFileSize: "4MB", maxFileCount: 1 }, 
  })
    .middleware(async ({ req }) => {
      // Usar la misma autenticación placeholder por ahora
      // !!! REEMPLAZAR CON AUTENTICACIÓN REAL DE SUPABASE !!!
      const user = await auth(req); 
      if (!user || !user.id) throw new UploadThingError("Unauthorized");
      
      // Podrías pasar metadata adicional si la necesitas en onUploadComplete
      // const clientId = req.headers.get("x-client-id"); 
      // return { userId: user.id, clientId };
      return { userId: user.id }; 
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[ClientDoc] Upload complete for userId:", metadata.userId);
      console.log("[ClientDoc] file url:", file.url);
      console.log("[ClientDoc] file key:", file.key);
      
      // Por ahora, solo devolvemos la información básica.
      // La lógica de crear el registro en 'archivos' y actualizar 
      // 'personas_*', etc., se hará en el frontend (EditClientPage handleSubmit)
      // O podrías mover esa lógica aquí si prefieres, pero requiere más metadata.
      return { uploadedBy: metadata.userId, fileKey: file.key };
    }),

  // Endpoint para comprobantes de pago
  paymentProof: f({
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
    image: { maxFileSize: "4MB", maxFileCount: 1 }, // Permitir imágenes o PDFs
  })
    .middleware(async ({ req }) => {
      const user = await auth(req);
      if (!user || !user.id) throw new UploadThingError("Unauthorized");
      
      const facturaId = req.headers.get("x-factura-id");
      return { 
        userId: user.id,
        facturaId: facturaId 
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[PaymentProof] Upload complete for userId:", metadata.userId);
      console.log("[PaymentProof] factura ID:", metadata.facturaId);
      console.log("[PaymentProof] file url:", file.url);
      console.log("[PaymentProof] file key:", file.key);
      
      return { 
        uploadedBy: metadata.userId, 
        facturaId: metadata.facturaId,
        fileUrl: file.url,
        fileKey: file.key 
      };
    }),

  // >>> NUEVO ENDPOINT PARA IMÁGENES DE PROYECTO <<<
  projectImage: f({
    image: { 
      maxFileSize: "4MB", 
      maxFileCount: 1 
    }
  })
    .middleware(async ({ req }) => {
      // Usar la misma autenticación placeholder por ahora
      const user = await auth(req);
      if (!user || !user.id) throw new UploadThingError("Unauthorized");
      
      // Opcionalmente podrías pasar metadata como el ID del proyecto
      // const projectId = req.headers.get("x-project-id");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[ProjectImage] Upload complete for userId:", metadata.userId);
      console.log("[ProjectImage] file url:", file.url);
      console.log("[ProjectImage] file key:", file.key);
      
      return { uploadedBy: metadata.userId, fileKey: file.key, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter; 