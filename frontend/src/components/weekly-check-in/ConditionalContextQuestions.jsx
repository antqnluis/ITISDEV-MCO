import RatingQuestion from "./RatingQuestion";

function ConditionalContextQuestions({ questions = [], values, onChange, errors }) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 border-t border-line pt-8">
      {questions.map((question) => (
        <RatingQuestion
          key={question.id}
          {...question}
          value={values[question.id]}
          onChange={(value) => onChange(question.id, value)}
          error={errors[question.id]}
        />
      ))}
    </div>
  );
}

export default ConditionalContextQuestions;
