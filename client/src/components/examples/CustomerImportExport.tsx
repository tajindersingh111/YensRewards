import CustomerImportExport from '../CustomerImportExport';

export default function CustomerImportExportExample() {
  return (
    <CustomerImportExport
      onImport={(file) => console.log("Import:", file.name)}
      onExport={() => console.log("Export")}
      customerCount={156}
    />
  );
}
