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
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter; 