const fs = require('fs');
let content = fs.readFileSync('mobile/src/features/planner/screens/CreateTripWizardScreen.tsx', 'utf8');
content = content.replace(/import { StepDestination } from '..\\/components\\/StepDestination';/g, `import { StepDestination } from '../components/StepDestination';
import { SupabaseDestinationSearchRepository } from '../../integration/remote/SupabaseDestinationSearchRepository';
import type { DestinationSearchRepository } from '../../integration/repositories/DestinationSearchRepository';`);
content = content.replace(/type Props = \{/, 'type Props = {\n  destinationSearchRepository?: DestinationSearchRepository;');
content = content.replace(/export function CreateTripWizardScreen\\(\{ initialStep = 1, generationRepository, onComplete \}: Props\\) \{? 'export function CreateTripWizardScreen({ initialStep = 1, generationRepository, destinationSearchRepository, onComplete }: Props) z\n  const destRepo = destinationSearchRepository || new SupabaseDestinationSearchRepository();');
content = content.replace(/<StepDestination\ns;a(customDestinationName=\{wizardState\.customDestinationName\})\s+\(error=\{stepError\})\s+\(onChangeCustomName=\{handleChangeCustomName\})\s+\(onSelectDestination=\{handleSelectDestination\})\s+\(selectedDestination=\{wizardState\.destination\})\s*\\/>/g, `<StepDestination
          customDestinationName={wizardState.customDestinationName}
          error={stepError}
          onChangeCustomName={handleChangeCustomName}
          onSelectDestination={handleSelectDestination}
          selectedDestination={wizardState.destination}
          repository={destRepo}
        />`);
fs.writeFileSync('mobile/src/features/planner/screens/CreateTripWizardScreen.tsx', content);