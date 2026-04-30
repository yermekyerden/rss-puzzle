import createElement from '../../shared/dom/create-element';
import { setUser } from '../../services/storage/auth-storage';
import validateUserName from './validate-user-name';

type LoginPageParams = {
  onLoginSuccess: () => void;
};

function createLabeledInput(
  labelText: string,
  name: string,
): {
  wrapper: HTMLDivElement;
  input: HTMLInputElement;
  error: HTMLDivElement;
} {
  const wrapper = createElement('div');

  const label = createElement('label', { textContent: labelText });
  label.htmlFor = name;

  const input = createElement('input', {
    attributes: {
      id: name,
      name,
      type: 'text',
      required: 'true',
      autocomplete: 'off',
    },
  });

  const error = createElement('div');
  error.setAttribute('aria-live', 'polite');

  wrapper.append(label, input, error);

  return { wrapper, input, error };
}

export default function renderLoginPage(root: HTMLElement, params: LoginPageParams): void {
  const appRoot = root;
  appRoot.innerHTML = '';

  const title = createElement('h1', { textContent: 'RSS Puzzle' });

  const form = createElement('form');

  const firstNameField = createLabeledInput('First name', 'firstName');
  const surnameField = createLabeledInput('Surname', 'surname');

  const submitButton = createElement('button', { textContent: 'Login' });
  submitButton.type = 'submit';
  submitButton.disabled = true;

  function updateValidity(): void {
    const firstNameResult = validateUserName('firstName', firstNameField.input.value);
    firstNameField.error.textContent = firstNameResult.errorMessage ?? '';

    const surnameResult = validateUserName('surname', surnameField.input.value);
    surnameField.error.textContent = surnameResult.errorMessage ?? '';

    submitButton.disabled = !(firstNameResult.isValid && surnameResult.isValid);
  }

  firstNameField.input.addEventListener('input', updateValidity);
  surnameField.input.addEventListener('input', updateValidity);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    updateValidity();

    if (submitButton.disabled) return;

    setUser({
      firstName: firstNameField.input.value.trim(),
      surname: surnameField.input.value.trim(),
    });

    params.onLoginSuccess();
  });

  form.append(firstNameField.wrapper, surnameField.wrapper, submitButton);
  appRoot.append(title, form);

  updateValidity();
}
