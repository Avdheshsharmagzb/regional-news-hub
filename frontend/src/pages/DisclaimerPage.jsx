import { SectionHeader } from "@/components/SectionHeader";

export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <SectionHeader title="अस्वीकरण एवं नियम-शर्तें" subtitle="कानूनी सूचना" />
      <div className="space-y-6 font-hindi-body hindi-lh text-foreground text-base">
        <section>
          <h3 className="font-semibold text-lg text-[#B71C1C] mb-2">1. सामान्य अस्वीकरण (Disclaimer)</h3>
          <p>गाज़ियाबाद टाइम्स पर प्रकाशित सभी समाचार एवं सामग्री केवल सूचना के उद्देश्य से प्रस्तुत की जाती है। हम समाचारों की सटीकता सुनिश्चित करने का पूरा प्रयास करते हैं, फिर भी किसी भी त्रुटि, चूक या विलंब के लिए पोर्टल उत्तरदायी नहीं होगा।</p>
        </section>
        <section>
          <h3 className="font-semibold text-lg text-[#B71C1C] mb-2">2. कॉपीराइट एवं स्रोत</h3>
          <p>विभिन्न स्रोतों से एकत्रित समाचारों को हमारी संपादकीय एवं AI प्रणाली द्वारा पूर्णतः मौलिक शब्दों में पुनर्लेखित किया जाता है, जिससे किसी भी प्रकार के कॉपीराइट उल्लंघन से बचा जा सके। सभी संख्यात्मक आँकड़े एवं मूल तथ्य यथावत रखे जाते हैं। छवियों पर 'गाज़ियाबाद टाइम्स' का वॉटरमार्क लगाया जाता है।</p>
        </section>
        <section>
          <h3 className="font-semibold text-lg text-[#B71C1C] mb-2">3. उत्तरदायित्व की सीमा</h3>
          <p>पोर्टल पर प्रकाशित किसी भी समाचार, विज्ञापन या तृतीय-पक्ष लिंक के आधार पर की गई किसी भी कार्रवाई के लिए उपयोगकर्ता स्वयं ज़िम्मेदार होगा।</p>
        </section>
        <section className="bg-[#B71C1C]/5 border border-[#B71C1C]/30 rounded-lg p-5">
          <h3 className="font-semibold text-lg text-[#B71C1C] mb-2">4. न्यायिक क्षेत्र (Jurisdiction)</h3>
          <p className="font-semibold" data-testid="disclaimer-jurisdiction">किसी भी तरह की कानूनी कार्यवाही या विवाद की स्थिति में न्यायिक क्षेत्र (Jurisdiction) केवल गाजियाबाद, उत्तर प्रदेश तक ही सीमित होगा।</p>
        </section>
        <section>
          <h3 className="font-semibold text-lg text-[#B71C1C] mb-2">5. संपर्क</h3>
          <p>किसी भी प्रश्न या शिकायत के लिए संपादकीय टीम से संपर्क करें: editor@ghaziabadtimes.com</p>
        </section>
      </div>
    </div>
  );
}
