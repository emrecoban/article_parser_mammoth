"use client";
import { useState, useCallback, useRef } from "react";
import mammoth from "mammoth";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown, Upload, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DocxStructureViewer = () => {
  const [structure, setStructure] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openSections, setOpenSections] = useState(new Set());
  const fileInputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result;
          const result = await mammoth.convertToHtml({ arrayBuffer });

          const parser = new DOMParser();
          const doc = parser.parseFromString(result.value, "text/html");

          const rootNode = { title: "Root", content: "", children: [] };
          const sections = doc.body.children;
          let currentNode = null;
          let contentBuffer = "";

          for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const boldElement = section.querySelector("strong");

            if (boldElement && boldElement.closest("li")) {
              if (currentNode) {
                currentNode.content = contentBuffer;
                contentBuffer = "";
              }

              currentNode = {
                title: boldElement.textContent || "",
                content: "",
                children: [],
              };
              rootNode.children.push(currentNode);
            } else if (currentNode) {
              contentBuffer += section.outerHTML;
            }
          }

          if (currentNode) {
            currentNode.content = contentBuffer;
          }

          setStructure(rootNode.children);
        } catch (error) {
          console.error("Error processing file content:", error);
          toast({
            title: "Error",
            description:
              "Dosya işlenirken bir hata oluştur. Lütfen tekrar deneyin ya da dosyayı değiştirin.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast({
          title: "Error",
          description: "Dosya okunamıyor. Lütfen başka dosya deneyin.",
          variant: "destructive",
        });
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error in processFile:", error);
      toast({
        title: "Error",
        description: "Beklenmeyen bir hata oluştu. Bunu bir konuşalım.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  }, []);

  const handleFileUpload = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file) {
        setFileName(file.name);
        processFile(file);
      }
    },
    [processFile]
  );

  const toggleSection = (index) => {
    setOpenSections((prevState) => {
      const newState = new Set(prevState);
      if (newState.has(index)) {
        newState.delete(index);
      } else {
        newState.add(index);
      }
      return newState;
    });
  };

  const TitleStructure = ({ node, index }) => {
    return (
      <div className="border-b last:border-b-0">
        <Collapsible open={openSections.has(index)}>
          <CollapsibleTrigger
            onClick={() => toggleSection(index)}
            className="flex items-center w-full text-left py-2 px-4 hover:bg-gray-100 focus:outline-none"
          >
            {openSections.has(index) ? (
              <ChevronDown className="mr-2 h-4 w-4 transition-transform" />
            ) : (
              <ChevronRight className="mr-2 h-4 w-4 transition-transform" />
            )}
            <span className="font-semibold">{node.title}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-6 p-4 bg-gray-50">
              {node.content && (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: node.content }}
                />
              )}
              {node.children.length > 0 && (
                <div className="mt-4">
                  {node.children.map((child, childIndex) => (
                    <TitleStructure
                      key={childIndex}
                      node={child}
                      index={childIndex}
                    />
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        Article Parser{" "}
        <span className="text-sm">(only .docx) by emrecoban</span>
      </h1>
      <div className="mb-6">
        <input
          type="file"
          accept=".docx"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
          ref={fileInputRef}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="cursor-pointer"
        >
          <Upload className="mr-2 h-4 w-4" /> Bir .docx uzantlı dosya seçin
        </Button>
        {fileName && (
          <p className="mt-2 text-sm text-gray-600">
            <FileText className="inline mr-2 h-4 w-4" />
            <b>Seçilen dosya:</b> {fileName}
          </p>
        )}
      </div>

      {isProcessing && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Makale işleniyor...</p>
        </div>
      )}

      {!isProcessing && structure.length > 0 && (
        <div className="border rounded-lg">
          <h2 className="text-xl font-semibold p-4 border-b">Makale Yapısı:</h2>
          {structure.map((node, index) => (
            <TitleStructure key={index} node={node} index={index} />
          ))}
        </div>
      )}

      {!isProcessing && structure.length === 0 && fileName && (
        <p className="text-center text-gray-600">
          No titles found in the document.
        </p>
      )}
    </div>
  );
};

export default DocxStructureViewer;
