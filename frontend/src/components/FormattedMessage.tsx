import { MessageCircleQuestion } from "lucide-react";

interface FormattedMessageProps {
  content: string;
  questions: string[];
  hasQuestions: boolean;
}

const FormattedMessage = ({ content, questions, hasQuestions }: FormattedMessageProps) => {
  return (
    <div className="space-y-4">
      {/* Main Content */}
      {content && (
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      )}
      
      {/* Questions in Purple Boxes */}
      {hasQuestions && questions.length > 0 && (
        <div className="space-y-2 mt-4">
          {questions.map((question, index) => (
            <div
              key={index}
              className="flex gap-3 p-3 bg-purple-500/10 border-l-4 border-purple-500 rounded-r-lg"
            >
              <MessageCircleQuestion className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-100 font-medium leading-relaxed">
                {question}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormattedMessage;


