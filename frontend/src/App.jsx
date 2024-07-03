import './App.css';

function App() {
  return (
    <div className="App h-screen overflow-hidden"> {/* Hide overflow on the main container */}
      <div className="wrapper h-full overflow-auto snap-y snap-mandatory"> {/* Create a wrapper for sections */}
        <Section bgColor="bg-white" alignment="justify-start" title="Section 1" />
        <Section bgColor="bg-white" alignment="justify-end" title="Section 2" />
        <Section bgColor="bg-white" alignment="justify-start" title="Section 3" />
        <Section bgColor="bg-white" alignment="justify-end" title="Section 4" />
      </div>
    </div>
  );
}

function Section({ bgColor, alignment, title }) {
  return (
    <div className={`Section ${bgColor} ${alignment}`}>
      <div className="w-full flex ${alignment}">
        <div className="p-10 text-black text-2xl">
          <h2 className="text-4xl mb-4">{title}</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum. Cras ultricies ligula sed nisi faucibus, ac cursus enim gravida. Duis nec sollicitudin odio, et convallis erat. Nulla facilisi. In hac habitasse platea dictumst. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Aenean ac sagittis nulla. Integer luctus dolor a nisi dictum, in feugiat est fermentum.</p>
          <p>Suspendisse potenti. Curabitur tincidunt, odio in vehicula tincidunt, odio augue gravida sem, at auctor velit justo sed odio. Phasellus vestibulum orci ac sapien vehicula, nec tincidunt libero ullamcorper. Morbi feugiat est eget bibendum feugiat. Sed vitae diam ac nunc bibendum auctor eget sit amet magna. Donec vel justo sit amet arcu fermentum tincidunt. Etiam eget varius dolor. Aliquam erat volutpat. Ut ac sapien id sapien auctor scelerisque.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
