import Error from "./Error";

const ErrorMessage = ({ title, message, onRetry }) => {
  return <Error title={title} message={message} onRetry={onRetry} />;
};

export default ErrorMessage;
