import React, { useState } from 'react';
import { Heart, Activity, Users, Shield, ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  detail: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <Heart className="w-12 h-12 text-white" />,
    title: 'Welcome to CathCPT',
    description: 'Your comprehensive cardiology charge capture tool.',
    detail: 'CathCPT helps you select CPT codes, track RVUs, and manage inpatient charges — all in a HIPAA-compliant mobile app.'
  },
  {
    icon: <Activity className="w-12 h-12 text-white" />,
    title: 'Cath Lab Coding',
    description: 'Fast, accurate CPT code selection for the cath lab.',
    detail: 'Choose from diagnostic cardiac, PCI, structural heart, EP, and peripheral codes. Built-in billing rules catch errors before submission. Templates speed up common cases.'
  },
  {
    icon: <Users className="w-12 h-12 text-white" />,
    title: 'Inpatient Rounds',
    description: 'Manage your patient list and submit daily charges.',
    detail: 'Pro mode adds patient management with E/M coding, diagnosis tracking, call list coverage, and real-time charge submission that syncs across your practice.'
  },
  {
    icon: <Shield className="w-12 h-12 text-white" />,
    title: 'Built for Compliance',
    description: 'HIPAA-compliant by design.',
    detail: 'AES-256 encryption at rest, automatic session lock, PHI minimization in audit logs, and privacy overlay in the app switcher. Your data is protected.'
  }
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
      <div className="w-full max-w-md px-6 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto mb-8 flex items-center justify-center">
          {step.icon}
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-gray-800 mb-3">{step.title}</h2>
        <p className="text-base text-gray-600 mb-3">{step.description}</p>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">{step.detail}</p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex items-center gap-1 px-4 py-3 text-gray-600 hover:text-gray-800"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={handleSkip}
            className="px-4 py-3 text-gray-500 hover:text-gray-700 text-sm"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isLastStep ? 'Get Started' : 'Next'}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
